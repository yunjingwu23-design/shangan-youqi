-- P0 operations. Retains existing job/user IDs and published content.
create table public.admin_memberships (
  user_id uuid primary key references public.app_users(user_id) on delete cascade,
  role text not null check(role in ('super_admin','editor','reviewer')),
  active boolean not null default true,
  granted_by uuid references public.app_users(user_id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.admin_memberships(user_id,role) select user_id,'editor' from public.site_managers on conflict do nothing;
create table private.admin_bootstrap_guard (singleton boolean primary key default true check(singleton),initialized_by uuid,initialized_at timestamptz not null default now());
create function private.admin_role() returns text language sql stable security definer set search_path='' as $$
  select role from public.admin_memberships where user_id=private.current_user_id() and active
$$;
create or replace function private.is_site_manager() returns boolean language sql stable security definer set search_path='' as $$ select private.admin_role() is not null $$;
create function private.require_admin(roles text[]) returns text language plpgsql security definer set search_path='' as $$
declare result text;
begin
  select role into result from public.admin_memberships where user_id=private.current_user_id() and active for share;
  if result is null or not(result=any(roles)) then raise exception 'ADMIN_FORBIDDEN' using errcode='42501'; end if;
  return result;
end $$;
create function private.recent_admin_otp() returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from jsonb_array_elements(coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->'amr','[]')) m
    where m->>'method'='otp' and (m->>'timestamp')::numeric between extract(epoch from now())-900 and extract(epoch from now())+60)
  then raise exception 'ADMIN_REAUTH' using errcode='42501'; end if;
end $$;

-- Remove only the former state-related checks, preserving field constraints.
do $$ declare item record; begin
  for item in select conname from pg_constraint where conrelid='public.job_catalog'::regclass and contype='c' and pg_get_constraintdef(oid) like '%state%'
  loop execute format('alter table public.job_catalog drop constraint %I',item.conname); end loop;
end $$;
alter table public.job_catalog drop constraint if exists job_catalog_city_check;
alter table public.job_catalog drop constraint if exists job_catalog_responsibilities_check;
alter table public.job_catalog drop constraint if exists job_catalog_requirements_check;
alter table public.job_catalog add column application_instructions text not null default '' check(char_length(application_instructions)<=6000), add column deadline_at timestamptz;
alter table public.job_catalog add constraint job_workflow_states check(state in ('draft','pending_review','approved','rejected','published','closed','expired')),
  add constraint job_city_length check(char_length(city)<=60), add constraint job_responsibilities_length check(char_length(responsibilities)<=12000),
  add constraint job_requirements_length check(char_length(requirements)<=6000),
  add constraint published_job_verified check(state<>'published' or (source_url ~ '^https://' and verified_at is not null and published_at is not null and (type<>'conversion_internship' or char_length(retention_evidence)>0)));

create table public.jd_import_files (
  id uuid primary key default gen_random_uuid(),uploaded_by uuid references public.app_users(user_id) on delete set null,
  file_name text not null check(char_length(file_name) between 1 and 160),file_type text not null check(file_type in ('txt','docx','pdf')),
  file_size integer not null check(file_size between 1 and 3145728),sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  extracted_text text not null check(char_length(extracted_text) between 1 and 50000),ready boolean not null default false,
  attached_job_id uuid references public.job_catalog(id) on delete set null,created_at timestamptz not null default now()
);
create table public.job_sources (
  id uuid primary key default gen_random_uuid(),job_id uuid not null references public.job_catalog(id) on delete cascade,
  revision integer not null,kind text not null check(kind in ('paste','file','legacy')),
  original_jd text not null check(char_length(original_jd)<=50000),corrected_jd text not null check(char_length(corrected_jd)<=50000),
  source_url text not null,source_published_at timestamptz,file_id uuid references public.jd_import_files(id),
  captured_by uuid,captured_at timestamptz not null default now(),unique(job_id,revision)
);
create table public.job_admin_meta (
  job_id uuid primary key references public.job_catalog(id) on delete cascade,
  version integer not null default 1,revision integer not null default 1,
  created_by uuid references public.app_users(user_id) on delete set null,updated_by uuid references public.app_users(user_id) on delete set null,
  approved_by uuid references public.app_users(user_id) on delete set null,approved_revision integer,
  current_source_id uuid references public.job_sources(id) on delete set null,
  created_at timestamptz not null default now(),submitted_at timestamptz,reviewed_at timestamptz
);
create table public.job_reviews (
  id uuid primary key default gen_random_uuid(),job_id uuid not null references public.job_catalog(id) on delete cascade,
  revision integer not null,version integer not null,action text not null,from_state text,to_state text not null,
  actor_id uuid,actor_email text not null default '',actor_role text not null,note text not null check(char_length(note)<=2000),
  self_review boolean not null default false,created_at timestamptz not null default now()
);
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),actor_id uuid,actor_email text not null default '',actor_role text not null,
  action text not null,target_id uuid,job_id uuid,version integer,from_state text,to_state text,note text not null default '',
  visibility text not null default 'job' check(visibility in ('job','system')),created_at timestamptz not null default now()
);
create table public.admin_invitations (
  id uuid primary key default gen_random_uuid(),email text not null check(char_length(email)<=254),
  role text not null check(role in ('super_admin','editor','reviewer')),token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
  created_by uuid references public.app_users(user_id) on delete set null,expires_at timestamptz not null,
  state text not null default 'pending' check(state in ('pending','accepted','revoked')),accepted_by uuid,accepted_at timestamptz,created_at timestamptz not null default now()
);
create index job_sources_history on public.job_sources(job_id,revision desc);
create index job_reviews_history on public.job_reviews(job_id,created_at desc);
create index admin_audit_history on public.admin_audit_logs(created_at desc);
create index admin_job_queue on public.job_catalog(state,updated_at desc);

-- Existing rows remain intact. This is explicitly a historical structured snapshot,
-- not a claim that the original source file was available during migration.
insert into public.job_sources(job_id,revision,kind,original_jd,corrected_jd,source_url)
select id,1,'legacy',concat_ws(E'\n',responsibilities,requirements,retention_evidence),concat_ws(E'\n',responsibilities,requirements,retention_evidence),source_url from public.job_catalog;
insert into public.job_admin_meta(job_id,current_source_id,approved_revision)
select j.id,s.id,case when j.state='published' then 1 else null end from public.job_catalog j join public.job_sources s on s.job_id=j.id and s.revision=1;

create function private.admin_event(p_action text,p_target uuid,p_job uuid,p_version integer,p_from text,p_to text,p_note text,p_visibility text default 'job',p_actor uuid default private.current_user_id())
returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.admin_audit_logs(actor_id,actor_email,actor_role,action,target_id,job_id,version,from_state,to_state,note,visibility)
  select p_actor,coalesce(u.email,''),coalesce(m.role,'system'),p_action,p_target,p_job,p_version,p_from,p_to,left(coalesce(p_note,''),2000),p_visibility
  from (select 1) d left join public.app_users a on a.user_id=p_actor left join auth.users u on u.id=a.auth_user_id left join public.admin_memberships m on m.user_id=p_actor;
end $$;
create function private.job_review(p_job uuid,p_revision integer,p_version integer,p_action text,p_from text,p_to text,p_note text,p_self boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.job_reviews(job_id,revision,version,action,from_state,to_state,actor_id,actor_email,actor_role,note,self_review)
  select p_job,p_revision,p_version,p_action,p_from,p_to,private.current_user_id(),u.email,private.admin_role(),p_note,p_self from auth.users u where u.id=auth.uid();
  perform private.admin_event(p_action,p_job,p_job,p_version,p_from,p_to,p_note);
end $$;

alter table public.admin_memberships enable row level security;
alter table public.admin_invitations enable row level security;
alter table public.job_admin_meta enable row level security;
alter table public.job_sources enable row level security;
alter table public.jd_import_files enable row level security;
alter table public.job_reviews enable row level security;
alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_memberships,public.admin_invitations,public.job_admin_meta,public.job_sources,public.jd_import_files,public.job_reviews,public.admin_audit_logs from anon,authenticated;
grant select on public.admin_memberships,public.job_admin_meta,public.job_sources,public.jd_import_files,public.job_reviews,public.admin_audit_logs to authenticated;
grant select(id,email,role,created_by,expires_at,state,accepted_by,accepted_at,created_at) on public.admin_invitations to authenticated;
grant all on public.admin_memberships,public.admin_invitations,public.job_admin_meta,public.job_sources,public.jd_import_files,public.job_reviews,public.admin_audit_logs to service_role;
create policy own_or_super_membership on public.admin_memberships for select to authenticated using(user_id=private.current_user_id() or private.admin_role()='super_admin');
create policy super_invitations on public.admin_invitations for select to authenticated using(private.admin_role()='super_admin');
create policy operations_meta on public.job_admin_meta for select to authenticated using(private.admin_role() is not null);
create policy operations_sources on public.job_sources for select to authenticated using(private.admin_role() is not null);
create policy operations_files on public.jd_import_files for select to authenticated using(private.admin_role() is not null and (attached_job_id is not null or uploaded_by=private.current_user_id() or private.admin_role()='super_admin'));
create policy operations_reviews on public.job_reviews for select to authenticated using(private.admin_role() is not null);
create policy operations_audit on public.admin_audit_logs for select to authenticated using(private.admin_role()='super_admin' or (private.admin_role() is not null and visibility='job'));
revoke insert,update,delete on public.job_catalog from authenticated;
drop policy manager_jobs_insert on public.job_catalog;
drop policy manager_jobs_update on public.job_catalog;
drop policy manager_jobs_delete on public.job_catalog;
drop policy public_jobs_read on public.job_catalog;
drop policy authenticated_jobs_read on public.job_catalog;
create policy public_jobs_read on public.job_catalog for select to anon using(state='published' and (deadline_at is null or deadline_at>now()));
create policy authenticated_jobs_read on public.job_catalog for select to authenticated using((state='published' and (deadline_at is null or deadline_at>now())) or private.admin_role() is not null);

create function public.bootstrap_site_admin(admin_email text) returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('shangan.admin.roles',0));
  if exists(select 1 from private.admin_bootstrap_guard) or exists(select 1 from public.admin_memberships where role='super_admin' and active) then raise exception 'ADMIN_BOOTSTRAPPED' using errcode='P0001'; end if;
  select a.user_id into owner_id from auth.users u join public.app_users a on a.auth_user_id=u.id where lower(u.email)=lower(trim(admin_email)) and u.email_confirmed_at is not null;
  if owner_id is null then raise exception 'ADMIN_VERIFIED_ACCOUNT_REQUIRED' using errcode='P0001'; end if;
  insert into public.admin_memberships(user_id,role) values(owner_id,'super_admin') on conflict(user_id) do update set role='super_admin',active=true,updated_at=now();
  insert into private.admin_bootstrap_guard(singleton,initialized_by) values(true,owner_id);
  perform private.admin_event('bootstrap',owner_id,null,null,null,'super_admin','项目所有者执行的一次性初始化','system',owner_id);
  return jsonb_build_object('user_id',owner_id,'role','super_admin');
end $$;

create function public.admin_create_invitation(target_email text,target_role text,invite_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result public.admin_invitations;
begin
  perform pg_advisory_xact_lock(hashtextextended('shangan.admin.roles',0));
  perform private.require_admin(array['super_admin']); perform private.recent_admin_otp();
  if target_role not in ('super_admin','editor','reviewer') or invite_hash !~ '^[a-f0-9]{64}$' or char_length(target_email)>254 or target_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'ADMIN_INVALID' using errcode='22023'; end if;
  insert into public.admin_invitations(email,role,token_hash,created_by,expires_at) values(lower(trim(target_email)),target_role,invite_hash,private.current_user_id(),now()+interval '48 hours') returning * into result;
  perform private.admin_event('invite_created',result.id,null,null,null,target_role,'邀请指定邮箱管理员','system');
  return jsonb_build_object('id',result.id,'email',result.email,'role',result.role,'expires_at',result.expires_at);
end $$;
create function public.admin_accept_invitation(invite_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare invitation public.admin_invitations; owner_id uuid:=private.current_user_id(); verified_email text;
begin
  if owner_id is null then raise exception 'ADMIN_FORBIDDEN' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('shangan.admin.roles',0));
  select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  select * into invitation from public.admin_invitations where token_hash=encode(sha256(convert_to(invite_token,'UTF8')),'hex') for update;
  if not found or invitation.state<>'pending' or invitation.expires_at<=now() or invitation.email is distinct from verified_email
    or not exists(select 1 from public.admin_memberships where user_id=invitation.created_by and role='super_admin' and active) then raise exception 'ADMIN_INVITE_INVALID' using errcode='P0001'; end if;
  if exists(select 1 from public.admin_memberships where user_id=owner_id and active) then raise exception 'ADMIN_ALREADY_MEMBER' using errcode='P0001'; end if;
  insert into public.admin_memberships(user_id,role,granted_by) values(owner_id,invitation.role,invitation.created_by)
    on conflict(user_id) do update set role=excluded.role,active=true,granted_by=excluded.granted_by,updated_at=now();
  update public.admin_invitations set state='accepted',accepted_by=owner_id,accepted_at=now() where id=invitation.id;
  perform private.admin_event('invite_accepted',invitation.id,null,null,null,invitation.role,'目标邮箱验证后领取邀请','system');
  return jsonb_build_object('role',invitation.role);
end $$;
create function public.admin_revoke_invitation(invitation_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.require_admin(array['super_admin']); perform private.recent_admin_otp();
  update public.admin_invitations set state='revoked' where id=invitation_id and state='pending';
  if not found then raise exception 'ADMIN_CONFLICT' using errcode='P0001'; end if;
  perform private.admin_event('invite_revoked',invitation_id,null,null,null,'revoked','撤销待领取邀请','system');
end $$;
create function public.admin_change_membership(target_user uuid,target_role text,is_active boolean,reason text) returns void language plpgsql security definer set search_path='' as $$
declare old public.admin_memberships;
begin
  perform pg_advisory_xact_lock(hashtextextended('shangan.admin.roles',0));
  perform private.require_admin(array['super_admin']); perform private.recent_admin_otp();
  if target_role not in ('super_admin','editor','reviewer') or char_length(trim(reason)) not between 5 and 2000 then raise exception 'ADMIN_INVALID' using errcode='22023'; end if;
  select * into old from public.admin_memberships where user_id=target_user for update;
  if not found then raise exception 'ADMIN_NOT_FOUND' using errcode='P0001'; end if;
  if old.role='super_admin' and old.active and (target_role<>'super_admin' or not is_active) and (select count(*) from public.admin_memberships where role='super_admin' and active)<=1 then raise exception 'ADMIN_LAST_SUPER' using errcode='P0001'; end if;
  update public.admin_memberships set role=target_role,active=is_active,granted_by=private.current_user_id(),updated_at=now() where user_id=target_user;
  perform private.admin_event('membership_changed',target_user,null,null,
    old.role||case when old.active then ':active' else ':disabled' end,
    target_role||case when is_active then ':active' else ':disabled' end,reason,'system');
end $$;
create function public.admin_assert_account_deletable() returns void language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('shangan.admin.roles',0));
  if exists(select 1 from public.admin_memberships where user_id=private.current_user_id() and role='super_admin' and active) and (select count(*) from public.admin_memberships where role='super_admin' and active)<=1 then raise exception 'ADMIN_LAST_SUPER' using errcode='P0001'; end if;
end $$;
-- Protect deletion through Auth as well. Project-owner SQL remains an explicit recovery path.
create function private.guard_last_admin() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if session_user in ('postgres','supabase_admin') then return old; end if;
  perform pg_advisory_xact_lock(hashtextextended('shangan.admin.roles',0));
  if old.role='super_admin' and old.active and (select count(*) from public.admin_memberships where role='super_admin' and active)<=1 then raise exception 'ADMIN_LAST_SUPER' using errcode='P0001'; end if;
  return old;
end $$;
create trigger preserve_last_admin before delete on public.admin_memberships for each row execute function private.guard_last_admin();

create function private.https_url(value text) returns boolean language sql immutable set search_path='' as $$ select value='' or value ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$' $$;
create function private.validate_job_payload(p jsonb) returns void language plpgsql set search_path='' as $$
declare k text; c jsonb;
begin
  if jsonb_typeof(p)<>'object' or exists(select 1 from jsonb_object_keys(p) as fields(field) where fields.field not in ('company','title','type','city','industry','cohort','responsibilities','requirements','source_url','apply_url','contacts','mail_subject','aliases','retention_evidence','application_instructions','deadline_at','raw_jd','source_published_at','source_file_id')) then raise exception 'ADMIN_INVALID' using errcode='22023'; end if;
  foreach k in array array['company','title','type','city','industry','cohort','responsibilities','requirements','source_url','apply_url','mail_subject','retention_evidence','application_instructions','raw_jd'] loop
    if jsonb_typeof(p->k) is distinct from 'string' then raise exception 'ADMIN_INVALID' using errcode='22023'; end if;
  end loop;
  if char_length(trim(p->>'company')) not between 1 and 100 or char_length(trim(p->>'title')) not between 1 and 120 or p->>'type' not in ('daily_internship','conversion_internship','autumn_recruitment','spring_recruitment')
    or char_length(p->>'city')>60 or char_length(p->>'industry')>60 or char_length(p->>'cohort')>60 or char_length(p->>'responsibilities')>12000 or char_length(p->>'requirements')>6000 or char_length(p->>'raw_jd')>50000
    or char_length(p->>'source_url')>2000 or char_length(p->>'apply_url')>2000 or not private.https_url(p->>'source_url') or not private.https_url(p->>'apply_url')
    or char_length(p->>'mail_subject')>200 or char_length(p->>'retention_evidence')>2000 or char_length(p->>'application_instructions')>6000 then raise exception 'ADMIN_INVALID' using errcode='22023'; end if;
  if jsonb_typeof(p->'contacts') is distinct from 'array' or jsonb_typeof(p->'aliases') is distinct from 'array' then raise exception 'ADMIN_INVALID' using errcode='22023'; end if;
  if jsonb_array_length(p->'contacts')>5 or jsonb_array_length(p->'aliases')>30 then raise exception 'ADMIN_INVALID' using errcode='22023'; end if;
  for c in select * from jsonb_array_elements(p->'contacts') loop
    if jsonb_typeof(c)<>'object' or jsonb_typeof(c->'email') is distinct from 'string' or jsonb_typeof(c->'label') is distinct from 'string' or char_length(c->>'email')>254 or char_length(c->>'label')>60 or c->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or exists(select 1 from jsonb_object_keys(c) as fields(field) where fields.field not in ('email','label')) then raise exception 'ADMIN_INVALID' using errcode='22023'; end if;
  end loop;
  for c in select * from jsonb_array_elements(p->'aliases') loop
    if jsonb_typeof(c)<>'string' or char_length(c#>>'{}') not between 1 and 60 then raise exception 'ADMIN_INVALID' using errcode='22023'; end if;
  end loop;
end $$;
create function private.job_ready(p_job uuid) returns void language plpgsql security definer set search_path='' as $$
declare j public.job_catalog;s public.job_sources;
begin
  select * into j from public.job_catalog where id=p_job;
  select x.* into s from public.job_sources x join public.job_admin_meta m on m.current_source_id=x.id where m.job_id=p_job;
  if trim(j.city)='' or trim(j.responsibilities)='' or trim(j.requirements)='' or j.source_url='' or not private.https_url(j.source_url) or trim(coalesce(s.corrected_jd,''))='' or (j.apply_url='' and jsonb_array_length(j.contacts)=0) then raise exception 'ADMIN_JOB_INCOMPLETE' using errcode='P0001'; end if;
  if j.deadline_at is not null and j.deadline_at<=now() then raise exception 'ADMIN_DEADLINE_PASSED' using errcode='P0001'; end if;
  if j.type='conversion_internship' and (trim(j.retention_evidence)='' or position(regexp_replace(lower(j.retention_evidence),'[[:space:]]','','g') in regexp_replace(lower(s.corrected_jd),'[[:space:]]','','g'))=0) then raise exception 'ADMIN_RETENTION_EVIDENCE' using errcode='P0001'; end if;
end $$;
create function public.admin_duplicate_jobs(payload jsonb,exclude_job uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  perform private.require_admin(array['super_admin','editor','reviewer']);
  select coalesce(jsonb_agg(x),'[]') into result from (select id,company,title,state from public.job_catalog j where j.id is distinct from exclude_job and state not in ('closed','expired') and
    ((lower(regexp_replace(company,'[[:space:]]','','g'))=lower(regexp_replace(payload->>'company','[[:space:]]','','g')) and lower(regexp_replace(title,'[[:space:]]','','g'))=lower(regexp_replace(payload->>'title','[[:space:]]','','g')) and city=payload->>'city' and type=payload->>'type') or (coalesce(payload->>'source_url','')<>'' and source_url=payload->>'source_url')) order by updated_at desc limit 10) x;
  return result;
end $$;

create function public.admin_register_import(file_name text,file_type text,file_size integer,file_sha text,source_text text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result public.jd_import_files;
begin
  perform private.require_admin(array['super_admin','editor']);
  insert into public.jd_import_files(uploaded_by,file_name,file_type,file_size,sha256,extracted_text) values(private.current_user_id(),file_name,file_type,file_size,file_sha,source_text) returning * into result;
  perform private.admin_event('jd_file_registered',result.id,null,null,null,null,'上传 JD 原件');
  return jsonb_build_object('id',result.id);
end $$;
-- Marking upload ready is reserved for the trusted server after Storage upload.
create function public.admin_finish_import(file_id uuid) returns void language plpgsql security definer set search_path='' as $$ begin update public.jd_import_files set ready=true where id=file_id; end $$;

create function public.admin_save_job(job_id uuid,expected_version integer,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare acting_role text; owner_id uuid:=private.current_user_id();j public.job_catalog;m public.job_admin_meta;source_id uuid;file_info public.jd_import_files;file_ref uuid;next_revision integer;next_version integer;was_new boolean:=job_id is null;source_date timestamptz;deadline timestamptz;
begin
  acting_role:=private.require_admin(array['super_admin','editor']); perform private.validate_job_payload(payload);
  deadline:=nullif(payload->>'deadline_at','')::timestamptz; source_date:=nullif(payload->>'source_published_at','')::timestamptz; file_ref:=nullif(payload->>'source_file_id','')::uuid;
  if not was_new then
    select * into j from public.job_catalog where id=job_id for update;
    select * into m from public.job_admin_meta where job_admin_meta.job_id=admin_save_job.job_id;
    if j.id is null then raise exception 'ADMIN_NOT_FOUND' using errcode='P0001'; end if;
    if acting_role<>'super_admin' and m.created_by is distinct from owner_id then raise exception 'ADMIN_FORBIDDEN' using errcode='42501'; end if;
    if m.version is distinct from expected_version then raise exception 'ADMIN_CONFLICT' using errcode='P0001'; end if;
    if j.state not in ('draft','rejected') then raise exception 'ADMIN_STATE' using errcode='P0001'; end if;
  end if;
  if file_ref is not null then
    select * into file_info from public.jd_import_files where id=file_ref for update;
    if file_info.id is null or not file_info.ready or (file_info.attached_job_id is null and file_info.uploaded_by is distinct from owner_id) or (file_info.attached_job_id is not null and file_info.attached_job_id is distinct from job_id) then raise exception 'ADMIN_FILE_INVALID' using errcode='P0001'; end if;
  end if;
  next_revision:=case when was_new then 1 else m.revision+1 end;next_version:=case when was_new then 1 else m.version+1 end;
  if was_new then
    insert into public.job_catalog(company,title,type,city,industry,cohort,responsibilities,requirements,source_url,apply_url,contacts,mail_subject,aliases,retention_evidence,application_instructions,deadline_at)
    values(trim(payload->>'company'),trim(payload->>'title'),payload->>'type',trim(payload->>'city'),payload->>'industry',payload->>'cohort',payload->>'responsibilities',payload->>'requirements',payload->>'source_url',payload->>'apply_url',payload->'contacts',payload->>'mail_subject',array(select jsonb_array_elements_text(payload->'aliases')),payload->>'retention_evidence',payload->>'application_instructions',deadline) returning * into j;
    job_id:=j.id;
    insert into public.job_admin_meta(job_id,created_by,updated_by) values(job_id,owner_id,owner_id);
  else
    update public.job_catalog set company=trim(payload->>'company'),title=trim(payload->>'title'),type=payload->>'type',city=trim(payload->>'city'),industry=payload->>'industry',cohort=payload->>'cohort',responsibilities=payload->>'responsibilities',requirements=payload->>'requirements',source_url=payload->>'source_url',apply_url=payload->>'apply_url',contacts=payload->'contacts',mail_subject=payload->>'mail_subject',aliases=array(select jsonb_array_elements_text(payload->'aliases')),retention_evidence=payload->>'retention_evidence',application_instructions=payload->>'application_instructions',deadline_at=deadline,state='draft',verified_at=null,updated_at=now() where id=job_id returning * into j;
  end if;
  insert into public.job_sources(job_id,revision,kind,original_jd,corrected_jd,source_url,source_published_at,file_id,captured_by)
    values(job_id,next_revision,case when file_ref is null then 'paste' else 'file' end,case when file_ref is null then payload->>'raw_jd' else file_info.extracted_text end,payload->>'raw_jd',payload->>'source_url',source_date,file_ref,owner_id) returning id into source_id;
  update public.job_admin_meta set version=next_version,revision=next_revision,updated_by=owner_id,current_source_id=source_id,approved_by=null,approved_revision=null,reviewed_at=null where job_admin_meta.job_id=admin_save_job.job_id;
  if file_ref is not null then update public.jd_import_files set attached_job_id=job_id where id=file_ref; end if;
  perform private.admin_event(case when was_new then 'draft_created' else 'draft_saved' end,job_id,job_id,next_version,null,'draft','保存岗位与来源快照');
  return jsonb_build_object('id',job_id,'version',next_version,'duplicates',public.admin_duplicate_jobs(payload,job_id));
end $$;

create function public.admin_transition_job(job_id uuid,expected_version integer,action text,reason text default '',source_checked boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare acting_role text;owner_id uuid:=private.current_user_id();j public.job_catalog;m public.job_admin_meta;next_state text;next_version integer;
begin
  acting_role:=private.require_admin(array['super_admin','editor','reviewer']);
  if char_length(reason)>2000 then raise exception 'ADMIN_INVALID' using errcode='22023'; end if;
  select * into j from public.job_catalog where id=job_id for update;
  select * into m from public.job_admin_meta where job_admin_meta.job_id=admin_transition_job.job_id;
  if j.id is null then raise exception 'ADMIN_NOT_FOUND' using errcode='P0001'; end if;
  if m.version is distinct from expected_version then raise exception 'ADMIN_CONFLICT' using errcode='P0001'; end if;
  if action in ('submit','withdraw','revise') then
    if acting_role not in ('super_admin','editor') or (acting_role<>'super_admin' and m.created_by is distinct from owner_id) then raise exception 'ADMIN_FORBIDDEN' using errcode='42501'; end if;
    if action='submit' then
      if j.state not in ('draft','rejected') then raise exception 'ADMIN_STATE' using errcode='P0001'; end if;
      perform private.job_ready(job_id);next_state:='pending_review';
    elsif action='withdraw' then
      if j.state<>'pending_review' then raise exception 'ADMIN_STATE' using errcode='P0001'; end if;next_state:='draft';
    else
      if j.state not in ('published','approved','closed','expired') then raise exception 'ADMIN_STATE' using errcode='P0001'; end if;next_state:='draft';
    end if;
  elsif action in ('approve','reject') then
    if acting_role not in ('super_admin','reviewer') or (m.created_by=owner_id and acting_role<>'super_admin') then raise exception 'ADMIN_FORBIDDEN' using errcode='42501'; end if;
    if j.state<>'pending_review' then raise exception 'ADMIN_STATE' using errcode='P0001'; end if;
    if char_length(trim(reason))<10 then raise exception 'ADMIN_REASON_REQUIRED' using errcode='P0001'; end if;
    if action='approve' then
      if source_checked is not true then raise exception 'ADMIN_SOURCE_CHECK_REQUIRED' using errcode='P0001'; end if;
      perform private.job_ready(job_id);next_state:='approved';
    else next_state:='rejected'; end if;
  elsif action in ('publish','close','expire') then
    if acting_role not in ('super_admin','reviewer') then raise exception 'ADMIN_FORBIDDEN' using errcode='42501'; end if;
    if action='publish' then
      if j.state<>'approved' or m.approved_revision is distinct from m.revision or m.approved_by is null then raise exception 'ADMIN_STATE' using errcode='P0001'; end if;
      perform private.job_ready(job_id);next_state:='published';
    elsif action='close' then
      if j.state not in ('published','approved') then raise exception 'ADMIN_STATE' using errcode='P0001'; end if;next_state:='closed';
    else
      if j.state<>'published' or j.deadline_at is null or j.deadline_at>now() then raise exception 'ADMIN_STATE' using errcode='P0001'; end if;next_state:='expired';
    end if;
  else raise exception 'ADMIN_INVALID' using errcode='22023'; end if;
  next_version:=m.version+1;
  update public.job_catalog set state=next_state,updated_at=now(),verified_at=case when action='approve' then now() when action='revise' then null else verified_at end,published_at=case when action='publish' then now() else published_at end where id=job_id;
  update public.job_admin_meta set version=next_version,updated_by=owner_id,submitted_at=case when action='submit' then now() else submitted_at end,
    reviewed_at=case when action in ('approve','reject') then now() when action='revise' then null else reviewed_at end,
    approved_by=case when action='approve' then owner_id when action in ('revise','withdraw','reject') then null else approved_by end,
    approved_revision=case when action='approve' then revision when action in ('revise','withdraw','reject') then null else approved_revision end where job_admin_meta.job_id=admin_transition_job.job_id;
  perform private.job_review(job_id,m.revision,next_version,action,j.state,next_state,case when trim(reason)='' then action else reason end,action='approve' and m.created_by=owner_id);
  return jsonb_build_object('id',job_id,'version',next_version,'state',next_state);
end $$;
create function public.admin_expire_jobs() returns integer language plpgsql security definer set search_path='' as $$
declare item record;total integer:=0;
begin
  perform private.require_admin(array['super_admin','reviewer']);
  for item in select j.id,m.version from public.job_catalog j join public.job_admin_meta m on m.job_id=j.id where j.state='published' and j.deadline_at<=now() order by j.id limit 500 for update of j skip locked loop
    perform public.admin_transition_job(item.id,item.version,'expire','招聘截止时间已过',false);total:=total+1;
  end loop;
  return total;
end $$;
create function public.admin_team() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  perform private.require_admin(array['super_admin']);
  select coalesce(jsonb_agg(x),'[]') into result from (select m.user_id,m.role,m.active,m.created_at,m.updated_at,u.email
    from public.admin_memberships m join public.app_users a on a.user_id=m.user_id join auth.users u on u.id=a.auth_user_id order by m.created_at) x;
  return result;
end $$;
create function public.admin_claim_stale_imports() returns table(file_id uuid,file_type text) language sql security definer set search_path='' as $$
  with candidates as (select f.id from public.jd_import_files f where f.attached_job_id is null and f.created_at<now()-interval '24 hours'
    and not exists(select 1 from public.job_sources s where s.file_id=f.id) order by f.created_at limit 100 for update skip locked)
  update public.jd_import_files f set ready=false from candidates c where f.id=c.id returning f.id,f.file_type
$$;

-- Public save RPC must also respect expiry; existing personal records are retained.
create or replace function public.save_catalog_job(job uuid,entry_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=private.current_user_id();position public.job_catalog;entry_id uuid;was_created boolean;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if entry_kind not in ('application','favorite') then raise exception 'INVALID_KIND' using errcode='22023'; end if;
  select * into position from public.job_catalog where id=job and state='published' and (deadline_at is null or deadline_at>now());
  if not found then raise exception 'JOB_NOT_FOUND' using errcode='P0001'; end if;
  insert into public.workspace_entries(user_id,kind,title,company,content,url,source_job_id)
  values(owner_id,entry_kind,position.title,position.company,'城市：'||position.city||E'\n岗位来源：'||position.source_url,coalesce(nullif(position.apply_url,''),position.source_url),position.id)
  on conflict(user_id,kind,source_job_id) where source_job_id is not null do nothing returning id into entry_id;
  was_created:=found;
  if not was_created then select id into entry_id from public.workspace_entries where user_id=owner_id and kind=entry_kind and source_job_id=job; end if;
  return jsonb_build_object('entry_id',entry_id,'created',was_created);
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('jd-originals','jd-originals',false,3145728,array['text/plain','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy jd_originals_server_only on storage.objects as restrictive for all to anon,authenticated using(bucket_id<>'jd-originals') with check(bucket_id<>'jd-originals');

revoke all on function private.admin_role(),private.require_admin(text[]),private.recent_admin_otp(),private.admin_event(text,uuid,uuid,integer,text,text,text,text,uuid),private.job_review(uuid,integer,integer,text,text,text,text,boolean),private.guard_last_admin(),private.https_url(text),private.validate_job_payload(jsonb),private.job_ready(uuid) from public,anon,authenticated;
grant execute on function private.admin_role() to authenticated;
revoke all on function public.bootstrap_site_admin(text),public.admin_finish_import(uuid),public.admin_claim_stale_imports() from public,anon,authenticated;
grant execute on function public.bootstrap_site_admin(text),public.admin_finish_import(uuid),public.admin_claim_stale_imports() to service_role;
revoke all on function public.admin_team() from public,anon;
grant execute on function public.admin_team() to authenticated;
revoke all on function public.admin_create_invitation(text,text,text),public.admin_accept_invitation(text),public.admin_revoke_invitation(uuid),public.admin_change_membership(uuid,text,boolean,text),public.admin_assert_account_deletable(),public.admin_duplicate_jobs(jsonb,uuid),public.admin_register_import(text,text,integer,text,text),public.admin_save_job(uuid,integer,jsonb),public.admin_transition_job(uuid,integer,text,text,boolean),public.admin_expire_jobs() from public,anon;
grant execute on function public.admin_create_invitation(text,text,text),public.admin_accept_invitation(text),public.admin_revoke_invitation(uuid),public.admin_change_membership(uuid,text,boolean,text),public.admin_assert_account_deletable(),public.admin_duplicate_jobs(jsonb,uuid),public.admin_register_import(text,text,integer,text,text),public.admin_save_job(uuid,integer,jsonb),public.admin_transition_job(uuid,integer,text,text,boolean),public.admin_expire_jobs() to authenticated;
notify pgrst,'reload schema';

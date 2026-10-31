-- Depends only on the account migration; does not require AI interview tables.
create table public.site_managers (
  user_id uuid primary key references public.app_users(user_id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.site_managers enable row level security;
revoke all on public.site_managers from anon,authenticated;
grant select on public.site_managers to authenticated;
grant all on public.site_managers to service_role;
create policy read_own_manager_flag on public.site_managers for select to authenticated using(user_id=(select private.current_user_id()));
create function private.is_site_manager() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.site_managers where user_id=private.current_user_id())
$$;
revoke all on function private.is_site_manager() from public,anon;
grant execute on function private.is_site_manager() to authenticated;
create table public.job_catalog (
  id uuid primary key default gen_random_uuid(),company text not null check(char_length(company) between 1 and 100),
  title text not null check(char_length(title) between 1 and 120),
  type text not null check(type in ('daily_internship','conversion_internship','autumn_recruitment','spring_recruitment')),
  city text not null check(char_length(city) between 1 and 60),industry text not null default '',cohort text not null default '',
  responsibilities text not null check(char_length(responsibilities) between 1 and 12000),
  requirements text not null check(char_length(requirements) between 1 and 6000),
  source_url text not null default '',apply_url text not null default '',contacts jsonb not null default '[]' check(jsonb_typeof(contacts)='array'),
  mail_subject text not null default '',aliases text[] not null default '{}',retention_evidence text not null default '',
  state text not null default 'draft' check(state in ('draft','published','closed')),
  verified_at timestamptz,published_at timestamptz,updated_at timestamptz not null default now(),
  check(state='draft' or (source_url ~ '^https://' and verified_at is not null and published_at is not null and (type<>'conversion_internship' or char_length(retention_evidence)>0)))
);
create index public_job_catalog_search on public.job_catalog(state,type,city,verified_at desc);
alter table public.job_catalog enable row level security;
revoke all on public.job_catalog from anon,authenticated;
grant select on public.job_catalog to anon,authenticated;
grant insert,update,delete on public.job_catalog to authenticated;
grant all on public.job_catalog to service_role;
create policy public_jobs_read on public.job_catalog for select to anon using(state='published');
create policy authenticated_jobs_read on public.job_catalog for select to authenticated using(state='published' or private.is_site_manager());
create policy manager_jobs_insert on public.job_catalog for insert to authenticated with check(private.is_site_manager());
create policy manager_jobs_update on public.job_catalog for update to authenticated using(private.is_site_manager()) with check(private.is_site_manager());
create policy manager_jobs_delete on public.job_catalog for delete to authenticated using(private.is_site_manager());
alter table public.workspace_entries add column source_job_id uuid references public.job_catalog(id) on delete set null;
create unique index workspace_catalog_job_unique on public.workspace_entries(user_id,kind,source_job_id) where source_job_id is not null;
create function public.save_catalog_job(job uuid,entry_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=private.current_user_id();position public.job_catalog;entry_id uuid;was_created boolean;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if entry_kind not in ('application','favorite') then raise exception 'INVALID_KIND' using errcode='22023'; end if;
  select * into position from public.job_catalog where id=job and state='published';
  if not found then raise exception 'JOB_NOT_FOUND' using errcode='P0001'; end if;
  insert into public.workspace_entries(user_id,kind,title,company,content,url,source_job_id)
  values(owner_id,entry_kind,position.title,position.company,'城市：'||position.city||E'\n岗位来源：'||position.source_url,
    coalesce(nullif(position.apply_url,''),position.source_url),position.id)
  on conflict(user_id,kind,source_job_id) where source_job_id is not null do nothing returning id into entry_id;
  was_created:=found;
  if not was_created then select id into entry_id from public.workspace_entries where user_id=owner_id and kind=entry_kind and source_job_id=job; end if;
  return jsonb_build_object('entry_id',entry_id,'created',was_created);
end $$;
revoke all on function public.save_catalog_job(uuid,text) from public,anon;
grant execute on function public.save_catalog_job(uuid,text) to authenticated;
notify pgrst,'reload schema';

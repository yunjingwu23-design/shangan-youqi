-- Foundation for a future Supabase integration. Not required by the local demo.
-- Apply to a clean Supabase project. Requires auth.users and auth.uid().
begin;
create extension if not exists pgcrypto;
create type public.job_type as enum ('daily_internship','conversion_internship','autumn_recruitment','spring_recruitment');
create type public.job_publication_state as enum ('draft','pending_review','published','unlisted','expired');
create table public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '', avatar_path text, school text, major text,
 graduation_year integer check(graduation_year between 1950 and 2100),
 preferred_industries text[] default '{}', preferred_cities text[] default '{}', created_at timestamptz not null default now()
);
create table public.user_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','mentor','user'))
);
-- Role assignments are trusted-server-only; users cannot grant themselves roles.
create function public.is_admin() returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin') $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
create table public.provider_identities (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null, app_id text not null, provider_subject text not null, union_id text,
 unique(provider,app_id,provider_subject)
);
create table public.companies (
 id uuid primary key default gen_random_uuid(), name text not null, canonical_name text not null unique,
 english_name text, industry text, official_url text check(official_url is null or official_url ~ '^https://')
);
create table public.company_aliases (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 alias text not null, approved boolean not null default false, unique(company_id,alias)
);
create table public.job_synonyms (
 id uuid primary key default gen_random_uuid(), canonical_term text not null, alias_term text not null,
 category text, approved boolean not null default false, unique(canonical_term,alias_term)
);
create table public.jobs (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 title text not null check(length(trim(title))>0), type public.job_type not null,
 city text not null, industry text, department text, graduation_year integer,
 duties text not null, requirements text not null, attendance text,
 retention_opportunity text not null default 'unspecified' check(retention_opportunity in ('possible','unspecified')),
 retention_evidence_text text, retention_evidence_url text,
 application_url text check(application_url is null or application_url ~ '^https://'),
 application_subject text, application_instructions text,
 source_url text not null check(source_url ~ '^https://'), source_type text not null,
 source_verified_at timestamptz, verified_by uuid references auth.users(id),
 status public.job_publication_state not null default 'draft', published_at timestamptz,
 deadline timestamptz, created_at timestamptz not null default now(),
 constraint conversion_requires_evidence check(type <> 'conversion_internship' or (retention_opportunity='possible' and length(trim(coalesce(retention_evidence_text,'')))>0)),
 constraint publication_requires_verification check(status <> 'published' or (source_verified_at is not null and verified_by is not null and published_at is not null))
);
create index jobs_public_search on public.jobs(status,type,city,published_at desc);
create table public.job_application_contacts (
 id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id) on delete cascade,
 email text not null check(email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'), label text, is_primary boolean not null default false,
 verified_at timestamptz, unique(job_id,email)
);
create table public.job_audit_logs (
 id uuid primary key default gen_random_uuid(), job_id uuid references public.jobs(id),
 actor_id uuid references auth.users(id), action text not null, before_data jsonb, after_data jsonb,
 created_at timestamptz not null default now()
);
create function public.audit_job_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.job_audit_logs(job_id,actor_id,action,before_data,after_data)
 values(new.id,auth.uid(),TG_OP,case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
create trigger audit_jobs after insert or update on public.jobs for each row execute function public.audit_job_change();
create table public.workspaces (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null default '我的上岸计划', created_at timestamptz not null default now(), unique(id,user_id)
);
create table public.workspace_statuses (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, user_id uuid not null,
 label text not null check(length(trim(label)) between 1 and 30), color text not null check(color ~ '^#[0-9a-fA-F]{6}$'),
 sort_order integer not null default 0, unique(id,workspace_id,user_id), unique(workspace_id,label),
 foreign key(workspace_id,user_id) references public.workspaces(id,user_id) on delete cascade
);
create table public.workspace_preferences (
 workspace_id uuid primary key, user_id uuid not null, cover_path text, theme text default '#506950',
 visible_columns jsonb default '[]', column_order jsonb default '[]', column_widths jsonb default '{}',
 foreign key(workspace_id,user_id) references public.workspaces(id,user_id) on delete cascade
);
create table public.workspace_fields (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, user_id uuid not null,
 label text not null, type text not null check(type in ('text','number','date','select','multiselect','checkbox','link')),
 options jsonb not null default '[]', sort_order integer default 0,
 foreign key(workspace_id,user_id) references public.workspaces(id,user_id) on delete cascade
);
create table public.application_records (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, user_id uuid not null,
 job_id uuid references public.jobs(id) on delete set null, company_name text not null, role_name text not null,
 job_type public.job_type, city text, channel text, applied_at date, next_action_at date, deadline date,
 status_id uuid not null, jd_url text, application_email text, resume_version_label text, notes text,
 custom_values jsonb not null default '{}', created_at timestamptz not null default now(), unique(id,user_id),
 foreign key(workspace_id,user_id) references public.workspaces(id,user_id) on delete cascade,
 foreign key(status_id,workspace_id,user_id) references public.workspace_statuses(id,workspace_id,user_id)
);
create unique index application_job_once_per_workspace on public.application_records(workspace_id,job_id) where job_id is not null;
create index application_user_workspace on public.application_records(user_id,workspace_id);
create table public.favorites (
 user_id uuid not null references auth.users(id) on delete cascade, job_id uuid not null references public.jobs(id) on delete cascade,
 created_at timestamptz default now(), primary key(user_id,job_id)
);
create table public.resume_versions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, private_file_path text, source_type text check(source_type in ('docx','pdf','manual')),
 structured_blocks jsonb default '[]', template_config jsonb default '{}', created_at timestamptz default now(), unique(id,user_id)
);
create table public.interview_reviews (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 application_id uuid, round text, interview_date date, questions text, answers text, notes text,
 private_audio_path text, transcript text, ai_feedback jsonb, recording_consent_at timestamptz,
 foreign key(application_id,user_id) references public.application_records(id,user_id) on delete cascade,
 constraint audio_requires_consent check(private_audio_path is null or recording_consent_at is not null)
);
create table public.content_sources (
 id uuid primary key default gen_random_uuid(), platform text not null, source_url text not null unique,
 discovered_at timestamptz default now(), rights_type text not null check(rights_type in ('original','licensed','external_index')),
 review_status text not null default 'pending', invalid_at timestamptz
);
create table public.interview_posts (
 id uuid primary key default gen_random_uuid(), company_id uuid references public.companies(id), title text not null,
 role_name text, round text, recruitment_year integer, body text, source_id uuid references public.content_sources(id),
 rights_type text not null check(rights_type in ('original','licensed','external_index')), status text not null default 'draft',
 constraint external_index_no_fulltext check(rights_type <> 'external_index' or body is null)
);
create table public.mock_interviewers (
 id uuid primary key default gen_random_uuid(), display_name text not null, specialities text[], description text,
 verified_at timestamptz, visible boolean not null default false
);
create table public.mock_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 interviewer_id uuid not null references public.mock_interviewers(id), requested_time timestamptz not null,
 status text not null default 'requested' check(status in ('requested','confirmed','cancelled','completed')),
 brief text, material_sharing_consent_at timestamptz, created_at timestamptz default now()
);
-- Explicit table grants; RLS remains the second boundary. No admin role grants from browser.
alter table public.user_roles enable row level security;
create policy own_role_read on public.user_roles for select to authenticated using(user_id=auth.uid());
alter table public.provider_identities enable row level security;
-- No client policy on provider identities: only the trusted OAuth server may access them.
alter table public.profiles enable row level security;
create policy own_profile_read on public.profiles for select to authenticated using(user_id=auth.uid());
create policy own_profile_insert on public.profiles for insert to authenticated with check(user_id=auth.uid());
create policy own_profile_update on public.profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
-- Private tables use ownership. Composite foreign keys prevent cross-user associations.
do $$ declare t text; begin
 foreach t in array array['workspaces','workspace_statuses','workspace_preferences','workspace_fields','application_records','favorites','resume_versions','interview_reviews'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy own_data on public.%I for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid())',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
alter table public.mock_requests enable row level security;
create policy own_mock_read on public.mock_requests for select to authenticated using(user_id=auth.uid());
create policy own_mock_create on public.mock_requests for insert to authenticated with check(user_id=auth.uid() and status='requested' and exists(select 1 from public.mock_interviewers m where m.id=interviewer_id and m.visible and m.verified_at is not null));
-- Confirmation/cancellation workflow must pass trusted server rules; no direct client updates.
do $$ declare t text; begin
 foreach t in array array['companies','company_aliases','job_synonyms','jobs','job_application_contacts','job_audit_logs','content_sources','interview_posts','mock_interviewers'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy admin_access on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
 end loop;
end $$;
-- Audit logs are append-only to clients, including admins; only the trigger inserts.
drop policy admin_access on public.job_audit_logs;
create policy admin_audit_read on public.job_audit_logs for select to authenticated using(public.is_admin());
create policy public_companies on public.companies for select to anon,authenticated using(true);
create policy public_aliases on public.company_aliases for select to anon,authenticated using(approved);
create policy public_synonyms on public.job_synonyms for select to anon,authenticated using(approved);
create policy public_jobs on public.jobs for select to anon,authenticated using(status='published');
create policy public_contacts on public.job_application_contacts for select to anon,authenticated using(verified_at is not null and exists(select 1 from public.jobs j where j.id=job_id and j.status='published'));
create policy public_sources on public.content_sources for select to anon,authenticated using(review_status='approved' and invalid_at is null);
create policy public_posts on public.interview_posts for select to anon,authenticated using(status='published');
create policy public_mentors on public.mock_interviewers for select to anon,authenticated using(visible and verified_at is not null);
grant select on public.companies,public.company_aliases,public.job_synonyms,public.jobs,public.job_application_contacts,public.content_sources,public.interview_posts,public.mock_interviewers to anon,authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select on public.user_roles,public.job_audit_logs to authenticated;
grant select,insert on public.mock_requests to authenticated;
grant insert,update,delete on public.companies,public.company_aliases,public.job_synonyms,public.jobs,public.job_application_contacts,public.content_sources,public.interview_posts,public.mock_interviewers to authenticated;
revoke all on public.provider_identities from anon,authenticated;
revoke insert,update,delete on public.user_roles,public.job_audit_logs from anon,authenticated;
commit;

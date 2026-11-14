-- Interview radar: a sustainable, source-traceable interview-experience index.
-- 直接整段复制到 Supabase SQL Editor 运行即可。

create extension if not exists pg_trgm;

-- ============================================================
-- Companies
-- ============================================================
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 100),
  english_name text not null default '' check (char_length(english_name) <= 200),
  industry text not null default '' check (char_length(industry) <= 80),
  company_group text not null default '' check (char_length(company_group) <= 100),
  verified_status text not null default 'unverified' check (verified_status in ('verified', 'unverified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_aliases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  alias text not null check (char_length(alias) between 1 and 100),
  created_at timestamptz not null default now(),
  unique (company_id, alias)
);
create index company_aliases_lookup on public.company_aliases using gin (alias gin_trgm_ops);
create index companies_name_trgm on public.companies using gin (name gin_trgm_ops);

-- ============================================================
-- Job roles
-- ============================================================
create table public.job_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  category text not null check (category in (
    'product_manager','operations','procurement','marketing','backend_dev',
    'frontend_dev','algorithm','data_analysis','finance','audit','consulting',
    'human_resources','supply_chain','other'
  )),
  custom boolean not null default false,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);
create index job_roles_company on public.job_roles(company_id);

create table public.role_aliases (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.job_roles(id) on delete cascade,
  alias text not null check (char_length(alias) between 1 and 100),
  created_at timestamptz not null default now(),
  unique (role_id, alias)
);

-- ============================================================
-- Sources & raw records
-- ============================================================
create table public.interview_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 60),
  source_type text not null check (source_type in ('community', 'official', 'other')),
  supported_methods text[] not null default '{}',
  authorization_status text not null default 'unauthorized' check (authorization_status in ('authorized', 'unauthorized', 'manual_only')),
  last_sync_at timestamptz,
  sync_status text not null default 'never' check (sync_status in ('never', 'synced', 'error', 'disabled')),
  error_message text not null default '' check (char_length(error_message) <= 1000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.interview_source_records (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.interview_sources(id) on delete restrict,
  platform_post_id text not null default '' check (char_length(platform_post_id) <= 200),
  normalized_url text not null default '' check (normalized_url = '' or normalized_url ~ '^https://'),
  title text not null check (char_length(title) between 1 and 300),
  author text not null default '' check (char_length(author) <= 100),
  published_at timestamptz,
  content_fingerprint text not null default '' check (char_length(content_fingerprint) <= 64),
  raw_excerpt text not null default '' check (char_length(raw_excerpt) <= 8000),
  status text not null default 'discovered' check (status in ('discovered', 'pending_verification', 'verified', 'secondary', 'expired')),
  imported_by uuid references public.app_users(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, platform_post_id)
);
create index source_records_status on public.interview_source_records(status, created_at desc);
create index source_records_url on public.interview_source_records(normalized_url);
create index source_records_fingerprint on public.interview_source_records(content_fingerprint);

-- ============================================================
-- Interview experiences (published, verified content)
-- ============================================================
create table public.interview_experiences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  job_role_id uuid not null references public.job_roles(id) on delete restrict,
  recruitment_type text not null check (recruitment_type in ('daily_internship', 'conversion_internship', 'autumn_recruitment', 'spring_recruitment', 'undetermined')),
  cohort text not null default '' check (char_length(cohort) <= 40),
  title text not null check (char_length(title) between 1 and 300),
  summary text not null default '' check (char_length(summary) <= 4000),
  source_record_id uuid references public.interview_source_records(id) on delete set null,
  origin text not null default 'external' check (origin in ('external', 'user_submission')),
  verification_status text not null default 'pending' check (verification_status in ('verified', 'pending', 'secondary', 'expired')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index experiences_browse on public.interview_experiences(company_id, job_role_id, recruitment_type, verification_status);
create index experiences_published on public.interview_experiences(published_at desc) where published_at is not null;
create index experiences_title_trgm on public.interview_experiences using gin (title gin_trgm_ops);

create table public.interview_rounds (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.interview_experiences(id) on delete cascade,
  round text not null check (round in ('written_test', 'ai_interview', 'online_assessment', 'group_interview', 'first_round', 'second_round', 'third_round', 'professional_round', 'hr_round', 'final_round', 'other')),
  sort_order integer not null default 0,
  unique (experience_id, round)
);

create table public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.interview_experiences(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  job_role_id uuid not null references public.job_roles(id) on delete restrict,
  recruitment_type text not null default 'undetermined',
  round text not null default 'other',
  question_text text not null check (char_length(question_text) between 1 and 2000),
  question_category text not null default 'other' check (question_category in (
    'self_intro', 'internship_experience', 'project_deep_dive', 'industry_knowledge',
    'professional_knowledge', 'behavioral', 'situational', 'case_interview',
    'technical', 'motivation', 'other'
  )),
  confidence_level text not null default 'pending' check (confidence_level in ('verified', 'pending', 'inferred')),
  source_record_id uuid references public.interview_source_records(id) on delete set null,
  created_at timestamptz not null default now()
);
create index questions_browse on public.interview_questions(company_id, job_role_id, round);
create index questions_text_trgm on public.interview_questions using gin (question_text gin_trgm_ops);

create table public.interview_reviews (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.interview_experiences(id) on delete cascade,
  reviewer_kind text not null check (reviewer_kind in ('original_author', 'user')),
  user_id uuid references public.app_users(user_id) on delete set null,
  difficulty text not null default '' check (char_length(difficulty) <= 60),
  experience_rating integer check (experience_rating between 1 and 5),
  review_text text not null default '' check (char_length(review_text) <= 4000),
  result text not null default '' check (char_length(result) <= 200),
  created_at timestamptz not null default now()
);

create table public.interview_tags (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.interview_experiences(id) on delete cascade,
  tag text not null check (char_length(tag) between 1 and 60),
  unique (experience_id, tag)
);

-- ============================================================
-- Collection tasks (framework only; no authorized auto-collectors yet)
-- ============================================================
create table public.collection_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_role_id uuid references public.job_roles(id) on delete set null,
  recruitment_type text not null default 'undetermined',
  keywords text[] not null default '{}',
  source_id uuid not null references public.interview_sources(id) on delete cascade,
  schedule jsonb not null default '{}',
  enabled boolean not null default false,
  last_run_at timestamptz,
  found_count integer not null default 0,
  verified_count integer not null default 0,
  last_error text not null default '' check (char_length(last_error) <= 1000),
  created_at timestamptz not null default now()
);

create table public.collection_runs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.collection_tasks(id) on delete cascade,
  source_id uuid not null references public.interview_sources(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'running', 'success', 'failed', 'skipped')),
  found_count integer not null default 0,
  verified_count integer not null default 0,
  error_message text not null default '' check (char_length(error_message) <= 1000),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- ============================================================
-- User-facing tables
-- ============================================================
create table public.user_interview_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(user_id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 100),
  job_role_name text not null check (char_length(job_role_name) between 1 and 100),
  recruitment_type text not null default 'undetermined',
  cohort text not null default '' check (char_length(cohort) <= 40),
  rounds text[] not null default '{}',
  questions jsonb not null default '[]' check (jsonb_typeof(questions) = 'array'),
  review_text text not null default '' check (char_length(review_text) <= 4000),
  source_url text not null default '' check (source_url = '' or source_url ~ '^https://'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderation_note text not null default '' check (char_length(moderation_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index submissions_status on public.user_interview_submissions(status, created_at desc);

create table public.user_saved_interviews (
  user_id uuid not null references public.app_users(user_id) on delete cascade,
  experience_id uuid not null references public.interview_experiences(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, experience_id)
);

create table public.user_source_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(user_id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  job_role_id uuid references public.job_roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, company_id, job_role_id)
);

create table public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.app_users(user_id) on delete set null,
  action text not null check (char_length(action) between 1 and 60),
  target_type text not null check (char_length(target_type) between 1 and 40),
  target_id uuid,
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS: reference tables readable by everyone (companies/roles/aliases)
-- ============================================================
alter table public.companies enable row level security;
alter table public.company_aliases enable row level security;
alter table public.job_roles enable row level security;
alter table public.role_aliases enable row level security;
alter table public.interview_sources enable row level security;
alter table public.interview_source_records enable row level security;
alter table public.interview_experiences enable row level security;
alter table public.interview_rounds enable row level security;
alter table public.interview_questions enable row level security;
alter table public.interview_reviews enable row level security;
alter table public.interview_tags enable row level security;
alter table public.collection_tasks enable row level security;
alter table public.collection_runs enable row level security;
alter table public.user_interview_submissions enable row level security;
alter table public.user_saved_interviews enable row level security;
alter table public.user_source_subscriptions enable row level security;
alter table public.moderation_logs enable row level security;

revoke all on public.companies, public.company_aliases, public.job_roles, public.role_aliases,
  public.interview_sources, public.interview_source_records, public.interview_experiences,
  public.interview_rounds, public.interview_questions, public.interview_reviews,
  public.interview_tags, public.collection_tasks, public.collection_runs,
  public.user_interview_submissions, public.user_saved_interviews,
  public.user_source_subscriptions, public.moderation_logs from anon, authenticated;

-- Public reference reads
grant select on public.companies, public.company_aliases, public.job_roles, public.role_aliases,
  public.interview_sources, public.interview_rounds, public.interview_tags to anon, authenticated;
create policy radar_companies_read on public.companies for select using (true);
create policy radar_company_aliases_read on public.company_aliases for select using (true);
create policy radar_job_roles_read on public.job_roles for select using (true);
create policy radar_role_aliases_read on public.role_aliases for select using (true);
create policy radar_sources_read on public.interview_sources for select using (true);
create policy radar_rounds_read on public.interview_rounds for select using (true);
create policy radar_tags_read on public.interview_tags for select using (true);

-- Published, verified experiences are readable by anon/authenticated
grant select on public.interview_experiences, public.interview_questions to anon, authenticated;
create policy radar_experiences_public on public.interview_experiences for select
  using (verification_status = 'verified' and published_at is not null);
create policy radar_questions_public on public.interview_questions for select
  using (exists (
    select 1 from public.interview_experiences e
    where e.id = experience_id and e.verification_status = 'verified' and e.published_at is not null
  ));

-- Author reviews are public; user reviews readable by all authenticated users
grant select on public.interview_reviews to anon, authenticated;
create policy radar_reviews_author on public.interview_reviews for select using (reviewer_kind = 'original_author');
create policy radar_reviews_user_read on public.interview_reviews for select to authenticated using (reviewer_kind = 'user');

-- Authenticated user writes
grant insert, update, delete on public.user_saved_interviews to authenticated;
grant insert, update, delete on public.user_source_subscriptions to authenticated;
grant insert (company_name, job_role_name, recruitment_type, cohort, rounds, questions, review_text, source_url)
  on public.user_interview_submissions to authenticated;
grant insert (experience_id, reviewer_kind, difficulty, experience_rating, review_text, result)
  on public.interview_reviews to authenticated;

create policy radar_saved_own on public.user_saved_interviews for all to authenticated
  using (user_id = private.current_user_id()) with check (user_id = private.current_user_id());
create policy radar_subscriptions_own on public.user_source_subscriptions for all to authenticated
  using (user_id = private.current_user_id()) with check (user_id = private.current_user_id());
create policy radar_submissions_own on public.user_interview_submissions for all to authenticated
  using (user_id = private.current_user_id()) with check (user_id = private.current_user_id());
create policy radar_reviews_user_insert on public.interview_reviews for insert to authenticated
  with check (reviewer_kind = 'user' and user_id = private.current_user_id());

-- Staff reads (admin role)
create policy radar_staff_experiences on public.interview_experiences for select to authenticated
  using (private.admin_role() is not null);
create policy radar_staff_questions on public.interview_questions for select to authenticated
  using (private.admin_role() is not null);
create policy radar_staff_records on public.interview_source_records for select to authenticated
  using (private.admin_role() is not null);
create policy radar_staff_submissions on public.user_interview_submissions for select to authenticated
  using (private.admin_role() is not null);
create policy radar_staff_tasks on public.collection_tasks for select to authenticated
  using (private.admin_role() is not null);
create policy radar_staff_runs on public.collection_runs for select to authenticated
  using (private.admin_role() is not null);
create policy radar_staff_logs on public.moderation_logs for select to authenticated
  using (private.admin_role() is not null);

grant all on public.companies, public.company_aliases, public.job_roles, public.role_aliases,
  public.interview_sources, public.interview_source_records, public.interview_experiences,
  public.interview_rounds, public.interview_questions, public.interview_reviews,
  public.interview_tags, public.collection_tasks, public.collection_runs,
  public.user_interview_submissions, public.user_saved_interviews,
  public.user_source_subscriptions, public.moderation_logs to service_role;

-- ============================================================
-- RPC: admin mutation entry points (security definer, role checked)
-- ============================================================
create function public.radar_manage(action text, payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  acting_role text;
  r jsonb;
begin
  acting_role := private.require_admin(array['super_admin', 'editor', 'reviewer']);

  if action = 'company' then
    insert into public.companies (name, english_name, industry, company_group, verified_status)
    values (trim(payload->>'name'), coalesce(payload->>'english_name',''),
            coalesce(payload->>'industry',''), coalesce(payload->>'company_group',''),
            coalesce(payload->>'verified_status','unverified'))
    on conflict (name) do update set
      english_name = excluded.english_name, industry = excluded.industry,
      company_group = excluded.company_group, verified_status = excluded.verified_status,
      updated_at = now()
    returning id into r;
  elsif action = 'company_alias' then
    insert into public.company_aliases (company_id, alias)
    values ((payload->>'company_id')::uuid, trim(payload->>'alias'))
    on conflict (company_id, alias) do nothing;
  elsif action = 'role' then
    insert into public.job_roles (company_id, name, category, custom)
    values ((payload->>'company_id')::uuid, trim(payload->>'name'),
            coalesce(payload->>'category','other'), true)
    on conflict (company_id, name) do nothing;
  elsif action = 'role_alias' then
    insert into public.role_aliases (role_id, alias)
    values ((payload->>'role_id')::uuid, trim(payload->>'alias'))
    on conflict (role_id, alias) do nothing;
  elsif action = 'source' then
    insert into public.interview_sources (name, source_type, supported_methods, authorization_status)
    values (trim(payload->>'name'), coalesce(payload->>'source_type','other'),
            coalesce(payload->'supported_methods','{}')::text[],
            coalesce(payload->>'authorization_status','manual_only'))
    on conflict (name) do update set source_type = excluded.source_type,
      supported_methods = excluded.supported_methods,
      authorization_status = excluded.authorization_status;
  elsif action = 'source_toggle' then
    update public.interview_sources set active = (payload->>'active')::boolean
    where id = (payload->>'id')::uuid;
  elsif action = 'publish_experience' then
    update public.interview_experiences
    set verification_status = 'verified', published_at = coalesce(published_at, now()), updated_at = now()
    where id = (payload->>'id')::uuid;
  elsif action = 'unpublish_experience' then
    update public.interview_experiences
    set verification_status = 'pending', published_at = null, updated_at = now()
    where id = (payload->>'id')::uuid;
  elsif action = 'review_submission' then
    update public.user_interview_submissions
    set status = (payload->>'status')::text,
        moderation_note = coalesce(payload->>'note',''),
        updated_at = now()
    where id = (payload->>'id')::uuid
      and (payload->>'status')::text in ('approved','rejected');
  elsif action = 'resolve_duplicate' then
    update public.interview_source_records set status = 'expired', updated_at = now()
    where id = (payload->>'duplicate_id')::uuid;
  else
    raise exception 'INVALID_ACTION' using errcode = '22023';
  end if;

  insert into public.moderation_logs (actor_id, action, target_type, target_id, note)
  values (private.current_user_id(), action, coalesce(payload->>'target_type',''),
          nullif(payload->>'target_id','')::uuid, coalesce(payload->>'note',''));
  return coalesce(r, '{}'::jsonb);
end $$;
revoke all on function public.radar_manage(text, jsonb) from public, anon;
grant execute on function public.radar_manage(text, jsonb) to authenticated;

notify pgrst, 'reload schema';

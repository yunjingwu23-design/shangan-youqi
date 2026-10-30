-- Internal IDs are independent from providers. Never derive/merge identity by email.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.app_users (
  user_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.profiles (
  user_id uuid primary key references public.app_users(user_id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 60),
  desired_role text not null default '' check (char_length(desired_role) <= 100),
  city text not null default '' check (char_length(city) <= 60),
  bio text not null default '' check (char_length(bio) <= 1000),
  updated_at timestamptz not null default now()
);
create table public.workspace_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(user_id) on delete cascade,
  kind text not null check (kind in ('application','resume','favorite','interview_review')),
  title text not null check (char_length(title) between 1 and 120),
  company text not null default '' check (char_length(company) <= 100),
  status text not null default 'planned' check (status in ('planned','applied','interview','offer','closed')),
  content text not null default '' check (char_length(content) <= 20000),
  url text not null default '' check (char_length(url) <= 2000 and (url = '' or url ~ '^https?://')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workspace_entries_owner_kind on public.workspace_entries(user_id, kind, created_at desc);
-- Reserved for future server-verified website OAuth linking. No browser writes.
create table public.external_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(user_id) on delete cascade,
  provider text not null check (provider = 'wechat'),
  issuer text not null check (char_length(issuer) between 1 and 255),
  subject text not null check (char_length(subject) between 1 and 255),
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(provider, issuer, subject),
  unique(user_id, provider, issuer)
);

create function private.current_user_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select user_id from public.app_users where auth_user_id = (select auth.uid()) $$;
revoke all on function private.current_user_id() from public;
grant execute on function private.current_user_id() to authenticated;

create function private.bootstrap_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare internal_id uuid;
begin
  insert into public.app_users(auth_user_id) values (new.id)
    on conflict (auth_user_id) do update set auth_user_id = excluded.auth_user_id
    returning user_id into internal_id;
  insert into public.profiles(user_id) values (internal_id) on conflict do nothing;
  return new;
end $$;
revoke all on function private.bootstrap_user() from public;
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.bootstrap_user();
-- Idempotent provisioning for users that predate this migration.
insert into public.app_users(auth_user_id) select id from auth.users on conflict do nothing;
insert into public.profiles(user_id) select user_id from public.app_users on conflict do nothing;

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
revoke all on function private.touch_updated_at() from public;
create trigger profile_updated before update on public.profiles for each row execute function private.touch_updated_at();
create trigger entry_updated before update on public.workspace_entries for each row execute function private.touch_updated_at();

alter table public.app_users enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_entries enable row level security;
alter table public.external_identities enable row level security;
-- Explicit grants avoid relying on Supabase's default privileges.
revoke all on public.app_users, public.profiles, public.workspace_entries, public.external_identities from anon, authenticated;
grant select on public.app_users, public.profiles, public.workspace_entries, public.external_identities to authenticated;
grant update (full_name, desired_role, city, bio) on public.profiles to authenticated;
grant insert (user_id, kind, title, company, status, content, url) on public.workspace_entries to authenticated;
grant update (title, company, status, content, url) on public.workspace_entries to authenticated;
grant delete on public.workspace_entries to authenticated;
grant all on public.app_users, public.profiles, public.workspace_entries, public.external_identities to service_role;

create policy own_mapping on public.app_users for select to authenticated using (auth_user_id = (select auth.uid()));
create policy own_profile_read on public.profiles for select to authenticated using (user_id = (select private.current_user_id()));
create policy own_profile_update on public.profiles for update to authenticated
  using (user_id = (select private.current_user_id())) with check (user_id = (select private.current_user_id()));
create policy own_entries_read on public.workspace_entries for select to authenticated using (user_id = (select private.current_user_id()));
create policy own_entries_insert on public.workspace_entries for insert to authenticated with check (user_id = (select private.current_user_id()));
create policy own_entries_update on public.workspace_entries for update to authenticated
  using (user_id = (select private.current_user_id())) with check (user_id = (select private.current_user_id()));
create policy own_entries_delete on public.workspace_entries for delete to authenticated using (user_id = (select private.current_user_id()));
create policy own_identities_read on public.external_identities for select to authenticated using (user_id = (select private.current_user_id()));

create function public.delete_my_personal_data() returns void
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := private.current_user_id();
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  delete from public.workspace_entries where user_id = owner_id;
  update public.profiles set full_name = '', desired_role = '', city = '', bio = '' where user_id = owner_id;
end $$;
revoke all on function public.delete_my_personal_data() from public, anon;
grant execute on function public.delete_my_personal_data() to authenticated;

-- Persistent, atomic limiter shared by all app instances. No raw email/IP stored.
create table private.auth_rate_limits (
  bucket_key text primary key,
  hits integer not null,
  started_at timestamptz not null,
  expires_at timestamptz not null
);
create function public.consume_auth_rate_limit(bucket text, maximum integer, period_seconds integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare row_value private.auth_rate_limits; evaluated_at timestamptz := clock_timestamp();
begin
  if char_length(bucket) <> 64 or maximum not between 1 and 1000 or period_seconds not between 1 and 86400 then
    raise exception 'Invalid rate limit';
  end if;
  insert into private.auth_rate_limits as limits(bucket_key, hits, started_at, expires_at)
  values (bucket, 1, evaluated_at, evaluated_at + make_interval(secs => period_seconds))
  on conflict (bucket_key) do update set
    hits = case when limits.expires_at <= evaluated_at then 1 else limits.hits + 1 end,
    started_at = case when limits.expires_at <= evaluated_at then evaluated_at else limits.started_at end,
    expires_at = case when limits.expires_at <= evaluated_at then excluded.expires_at else limits.expires_at end
  returning * into row_value;
  return jsonb_build_object('allowed', row_value.hits <= maximum, 'retry_after',
    greatest(1, ceil(extract(epoch from row_value.expires_at - evaluated_at))::integer));
end $$;
revoke all on function public.consume_auth_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_auth_rate_limit(text, integer, integer) to service_role;
comment on table public.external_identities is 'Future verified OAuth only: authenticated, recent reauth, one-use state/PKCE, issuer+subject verification. Never merge by email or unverified unionid.';

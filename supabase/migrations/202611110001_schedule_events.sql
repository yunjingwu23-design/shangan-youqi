-- Personal schedule: deadlines, tests, interviews and reviews owned by one user.
-- Idempotent: safe to re-run on an existing database.

create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(user_id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  kind text not null default 'deadline'
    check (kind in ('deadline', 'online_test', 'interview', 'review', 'follow_up', 'other')),
  company text not null default '' check (char_length(company) <= 100),
  role text not null default '' check (char_length(role) <= 100),
  job_entry_id uuid,
  starts_at timestamptz not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 5 and 1440),
  remind_days integer not null default 1 check (remind_days between 0 and 30),
  note text not null default '' check (char_length(note) <= 2000),
  state text not null default 'open' check (state in ('open', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Optional link to the user's own workspace application entry.
  constraint schedule_event_job_fk foreign key (job_entry_id, user_id)
    references public.workspace_entries(id, user_id) on delete set null (job_entry_id)
);

create index if not exists schedule_events_owner_time
  on public.schedule_events(user_id, starts_at);
create index if not exists schedule_events_owner_state
  on public.schedule_events(user_id, state, starts_at);

drop trigger if exists schedule_event_updated on public.schedule_events;
create trigger schedule_event_updated before update on public.schedule_events
for each row execute function private.touch_updated_at();

alter table public.schedule_events enable row level security;

revoke all on public.schedule_events from anon, authenticated;
grant select on public.schedule_events to authenticated;
grant insert (user_id, title, kind, company, role, job_entry_id, starts_at,
  duration_minutes, remind_days, note, state) on public.schedule_events to authenticated;
grant update (title, kind, company, role, job_entry_id, starts_at,
  duration_minutes, remind_days, note, state) on public.schedule_events to authenticated;
grant delete on public.schedule_events to authenticated;
grant all on public.schedule_events to service_role;

drop policy if exists own_schedule_read on public.schedule_events;
create policy own_schedule_read on public.schedule_events for select to authenticated
  using (user_id = (select private.current_user_id()));

drop policy if exists own_schedule_insert on public.schedule_events;
create policy own_schedule_insert on public.schedule_events for insert to authenticated
  with check (user_id = (select private.current_user_id()));

drop policy if exists own_schedule_update on public.schedule_events;
create policy own_schedule_update on public.schedule_events for update to authenticated
  using (user_id = (select private.current_user_id()))
  with check (user_id = (select private.current_user_id()));

drop policy if exists own_schedule_delete on public.schedule_events;
create policy own_schedule_delete on public.schedule_events for delete to authenticated
  using (user_id = (select private.current_user_id()));

-- Account deletion must also clear the calendar, like every other personal record.
create or replace function public.delete_my_personal_data() returns void
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := private.current_user_id();
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  delete from public.schedule_events where user_id = owner_id;
  delete from public.workspace_entries where user_id = owner_id;
  update public.profiles set full_name = '', desired_role = '', city = '', bio = '' where user_id = owner_id;
end $$;
revoke all on function public.delete_my_personal_data() from public, anon;
grant execute on function public.delete_my_personal_data() to authenticated;

-- Refresh PostgREST so the new table is reachable right away.
notify pgrst, 'reload schema';

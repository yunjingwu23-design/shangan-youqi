-- Apply after the account migration. No existing personal data is replaced.
alter table public.workspace_entries add constraint workspace_entry_owner_unique unique(id,user_id);
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(user_id) on delete cascade,
  job_id uuid, job_title text not null, title text not null check(char_length(title) between 1 and 120),
  round text not null check(char_length(round) between 1 and 60),
  file_name text not null check(char_length(file_name) between 1 and 200),
  file_size bigint not null check(file_size between 1 and 52428800), mime_type text not null,
  audio_path text not null unique, duration_seconds numeric,
  consent_version text not null, authorized_at timestamptz not null default now(),
  context_consent boolean not null, jd text not null default '' check(char_length(jd)<=10000),
  resume text not null default '' check(char_length(resume)<=15000),
  status text not null default 'awaiting_upload' check(status in ('awaiting_upload','queued','transcribing','review','analyzing','complete','failed','cancelled','deleting')),
  transcript_version integer not null default 0, error_code text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(job_id,user_id) references public.workspace_entries(id,user_id) on delete set null(job_id),
  check(context_consent or (jd='' and resume=''))
);
create index interviews_owner_time on public.interviews(user_id,created_at desc);
create table public.interview_transcripts (
  interview_id uuid not null references public.interviews(id) on delete cascade,
  version integer not null check(version>0), segments jsonb not null check(jsonb_typeof(segments)='array'),
  confirmed_at timestamptz, created_at timestamptz not null default now(),
  primary key(interview_id,version)
);
create table public.interview_reports (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  source_version integer not null, revision integer not null,
  body jsonb not null check(jsonb_typeof(body)='object'),
  author text not null check(author in ('ai','manual')), model text,
  created_at timestamptz not null default now(),
  unique(interview_id,revision),
  foreign key(interview_id,source_version) references public.interview_transcripts(interview_id,version) on delete cascade
);
create table public.interview_tasks (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  kind text not null check(kind in ('transcribe','report')), target_version integer not null default 0,
  state text not null default 'queued' check(state in ('queued','running','done','failed','cancelled')),
  progress integer not null default 0 check(progress between 0 and 100), attempts integer not null default 0,
  lease_token uuid, lease_until timestamptz, available_at timestamptz not null default now(),
  error_code text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index interview_single_active_task on public.interview_tasks(interview_id) where state in ('queued','running');
create index interview_task_claim on public.interview_tasks(state,available_at,lease_until);
create table private.interview_chunks (
  interview_id uuid not null references public.interviews(id) on delete cascade,
  chunk_index integer not null, segment jsonb not null, primary key(interview_id,chunk_index)
);
create table private.interview_limits (
  user_id uuid primary key references public.app_users(user_id) on delete cascade,
  monthly_usd numeric not null default 5 check(monthly_usd between 0 and 1000),
  monthly_audio_seconds integer not null default 18000 check(monthly_audio_seconds between 0 and 3600000),
  monthly_uploads integer not null default 20 check(monthly_uploads between 0 and 10000)
);
create table private.interview_usage (
  user_id uuid not null references public.app_users(user_id) on delete cascade,
  period date not null, uploads integer not null default 0,
  audio_seconds numeric not null default 0, estimated_usd numeric not null default 0,
  input_tokens bigint not null default 0, output_tokens bigint not null default 0,
  primary key(user_id,period)
);
create table private.interview_calls (
  id uuid primary key, user_id uuid not null references public.app_users(user_id) on delete cascade,
  task_id uuid references public.interview_tasks(id) on delete set null,
  period date not null, estimated_usd numeric not null, audio_seconds numeric not null,
  input_tokens bigint not null default 0, output_tokens bigint not null default 0,
  model text not null, status text not null default 'started' check(status in ('started','complete')),
  created_at timestamptz not null default now()
);
-- Survives account deletion to remove late uploads made with an already issued token.
create table private.interview_cleanup (
  path text primary key, next_attempt timestamptz not null default now(),
  retain_until timestamptz not null default now()+interval '3 hours'
);
create function private.interview_on_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into private.interview_cleanup(path) values(old.audio_path)
    on conflict(path) do update set next_attempt=now(),retain_until=greatest(private.interview_cleanup.retain_until,excluded.retain_until);
  return old;
end $$;
revoke all on function private.interview_on_delete() from public;
create trigger interview_audio_cleanup before delete on public.interviews for each row execute function private.interview_on_delete();

alter table public.interviews enable row level security;
alter table public.interview_transcripts enable row level security;
alter table public.interview_reports enable row level security;
alter table public.interview_tasks enable row level security;
revoke all on public.interviews,public.interview_transcripts,public.interview_reports,public.interview_tasks from anon,authenticated;
grant select on public.interviews,public.interview_transcripts,public.interview_reports,public.interview_tasks to authenticated;
grant all on public.interviews,public.interview_transcripts,public.interview_reports,public.interview_tasks to service_role;
create policy own_interview on public.interviews for select to authenticated using(user_id=(select private.current_user_id()));
create policy own_interview_transcript on public.interview_transcripts for select to authenticated using(exists(select 1 from public.interviews i where i.id=interview_id and i.user_id=(select private.current_user_id())));
create policy own_interview_report on public.interview_reports for select to authenticated using(exists(select 1 from public.interviews i where i.id=interview_id and i.user_id=(select private.current_user_id())));
create policy own_interview_task on public.interview_tasks for select to authenticated using(exists(select 1 from public.interviews i where i.id=interview_id and i.user_id=(select private.current_user_id())));

create function public.interview_usage_summary() returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=private.current_user_id(); result jsonb;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  insert into private.interview_limits(user_id) values(owner_id) on conflict do nothing;
  insert into private.interview_usage(user_id,period) values(owner_id,date_trunc('month',now())::date) on conflict do nothing;
  select to_jsonb(u)||jsonb_build_object('monthly_usd',l.monthly_usd,'monthly_audio_seconds',l.monthly_audio_seconds,'monthly_uploads',l.monthly_uploads)
    into result from private.interview_usage u join private.interview_limits l using(user_id)
    where u.user_id=owner_id and u.period=date_trunc('month',now())::date;
  return result;
end $$;

create function public.create_interview(details jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=private.current_user_id(); new_id uuid:=gen_random_uuid(); job_title text; current_usage jsonb;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text,1));
  current_usage:=public.interview_usage_summary();
  if (current_usage->>'uploads')::integer >= (current_usage->>'monthly_uploads')::integer then raise exception 'UPLOAD_QUOTA' using errcode='P0001'; end if;
  select title into job_title from public.workspace_entries where id=(details->>'jobId')::uuid and user_id=owner_id and kind='application';
  if job_title is null then raise exception 'JOB_NOT_FOUND' using errcode='P0001'; end if;
  if details->>'recordingConsent' is distinct from 'true' or (details->>'fileSize')::bigint not between 1 and 52428800 or details->>'consentVersion' <> '2026-10-31' then
    raise exception 'INVALID_UPLOAD' using errcode='P0001';
  end if;
  insert into public.interviews(id,user_id,job_id,job_title,title,round,file_name,file_size,mime_type,audio_path,consent_version,context_consent,jd,resume)
  values(new_id,owner_id,(details->>'jobId')::uuid,job_title,details->>'title',details->>'round',details->>'fileName',
    (details->>'fileSize')::bigint,details->>'mimeType',owner_id::text||'/'||new_id::text||'/source',details->>'consentVersion',
    (details->>'contextConsent')::boolean,coalesce(details->>'jd',''),coalesce(details->>'resume',''));
  update private.interview_usage set uploads=uploads+1 where user_id=owner_id and period=date_trunc('month',now())::date;
  return new_id;
end $$;

create function public.interview_action(interview uuid, action text, payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare row_value public.interviews; next_version integer; source public.interview_transcripts; previous_task public.interview_tasks;
begin
  select * into row_value from public.interviews where id=interview and user_id=private.current_user_id() for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if action='delete' then
    update public.interview_tasks set state='cancelled',lease_token=null,lease_until=null where interview_id=interview and state in ('queued','running');
    delete from public.interviews where id=interview;
    return jsonb_build_object('deleted',true);
  elsif action='cancel' then
    if row_value.status not in ('awaiting_upload','queued','transcribing','analyzing') then raise exception 'STATE_CONFLICT' using errcode='P0001'; end if;
    update public.interview_tasks set state='cancelled',lease_token=null,lease_until=null,error_code='cancelled' where interview_id=interview and state in ('queued','running');
    update public.interviews set status='cancelled',error_code='cancelled',updated_at=now() where id=interview;
  elsif action='transcribe' then
    if row_value.status<>'awaiting_upload' then raise exception 'STATE_CONFLICT' using errcode='P0001'; end if;
    insert into public.interview_tasks(interview_id,kind) values(interview,'transcribe');
    update public.interviews set status='queued',error_code=null,updated_at=now() where id=interview;
  elsif action='transcript' then
    if row_value.status not in ('review','complete','cancelled','failed') or row_value.transcript_version<1 or row_value.transcript_version is distinct from (payload->>'version')::integer then
      raise exception 'VERSION_CONFLICT' using errcode='P0001';
    end if;
    if jsonb_typeof(payload->'segments') is distinct from 'array' or jsonb_array_length(payload->'segments') not between 1 and 500 or octet_length((payload->'segments')::text)>500000 then raise exception 'INVALID_TRANSCRIPT' using errcode='P0001'; end if;
    next_version:=row_value.transcript_version+1;
    insert into public.interview_transcripts(interview_id,version,segments) values(interview,next_version,payload->'segments');
    update public.interviews set transcript_version=next_version,status='review',error_code=null,updated_at=now() where id=interview;
  elsif action='report' then
    if payload->'confirmed' is distinct from 'true'::jsonb then raise exception 'TRANSCRIPT_UNCONFIRMED' using errcode='P0001'; end if;
    if row_value.status not in ('review','complete') or row_value.transcript_version is distinct from (payload->>'version')::integer then raise exception 'VERSION_CONFLICT' using errcode='P0001'; end if;
    select * into source from public.interview_transcripts where interview_id=interview and version=row_value.transcript_version;
    if source.version is null then raise exception 'INVALID_TRANSCRIPT' using errcode='P0001'; end if;
    update public.interview_transcripts set confirmed_at=now() where interview_id=interview and version=source.version;
    insert into public.interview_tasks(interview_id,kind,target_version) values(interview,'report',source.version);
    update public.interviews set status='analyzing',error_code=null,updated_at=now() where id=interview;
  elsif action='delete_report' then
    if row_value.status='analyzing' then raise exception 'STATE_CONFLICT' using errcode='P0001'; end if;
    delete from public.interview_reports where interview_id=interview;
    update public.interviews set status=case when transcript_version>0 then 'review' else status end,updated_at=now() where id=interview;
  elsif action='edit_report' then
    if row_value.status='analyzing' then raise exception 'STATE_CONFLICT' using errcode='P0001'; end if;
    if jsonb_typeof(payload->'body') is distinct from 'object' or octet_length((payload->'body')::text)>150000 then raise exception 'INVALID_REPORT' using errcode='P0001'; end if;
    select max(revision)+1 into next_version from public.interview_reports where interview_id=interview;
    if next_version is null or next_version<>(payload->>'revision')::integer+1 then raise exception 'VERSION_CONFLICT' using errcode='P0001'; end if;
    insert into public.interview_reports(interview_id,source_version,revision,body,author)
    select interview,source_version,next_version,payload->'body','manual' from public.interview_reports where interview_id=interview and revision=next_version-1;
  elsif action='retry' then
    if row_value.status not in ('failed','cancelled') then raise exception 'STATE_CONFLICT' using errcode='P0001'; end if;
    select * into previous_task from public.interview_tasks where interview_id=interview order by created_at desc limit 1;
    if previous_task.id is null then raise exception 'STATE_CONFLICT' using errcode='P0001'; end if;
    insert into public.interview_tasks(interview_id,kind,target_version) values(interview,previous_task.kind,previous_task.target_version);
    update public.interviews set status=case previous_task.kind when 'report' then 'analyzing' else 'queued' end,error_code=null,updated_at=now() where id=interview;
  else raise exception 'INVALID_ACTION' using errcode='P0001';
  end if;
  return jsonb_build_object('ok',true);
end $$;

revoke all on function public.interview_usage_summary(),public.create_interview(jsonb),public.interview_action(uuid,text,jsonb) from public,anon;
grant execute on function public.interview_usage_summary(),public.create_interview(jsonb),public.interview_action(uuid,text,jsonb) to authenticated;

-- All operations below are restricted to a trusted Worker, never a browser.
create function public.interview_worker(operation text,task uuid default null,lease uuid default null,payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  work public.interview_tasks; item public.interviews; usage_row private.interview_usage; limits_row private.interview_limits;
  call_row private.interview_calls; result jsonb; next_revision integer; period_value date:=date_trunc('month',now())::date;
  estimated numeric; seconds_value numeric; call_id uuid; expired record;
begin
  if operation='cleanup_list' then
    select coalesce(jsonb_agg(to_jsonb(c)),'[]') into result from
      (select path,retain_until from private.interview_cleanup where next_attempt<=now() order by next_attempt limit 20) c;
    return result;
  elsif operation='cleanup_done' then
    delete from private.interview_cleanup where path=payload->>'path' and retain_until<=now();
    update private.interview_cleanup set next_attempt=now()+interval '5 minutes' where path=payload->>'path';
    return jsonb_build_object('ok',true);
  elsif operation='claim' then
    for expired in select id,interview_id from public.interview_tasks where state='running' and lease_until<now() and attempts>=3 order by id loop
      perform 1 from public.interviews where id=expired.interview_id for update skip locked;
      if not found then continue; end if;
      update public.interview_tasks set state='failed',error_code='worker_timeout',lease_token=null,lease_until=null
        where id=expired.id and state='running' and lease_until<now() and attempts>=3;
      if found then update public.interviews set status='failed',error_code='worker_timeout',updated_at=now() where id=expired.interview_id; end if;
    end loop;
    select * into work from public.interview_tasks
      where (state='queued' and available_at<=now()) or (state='running' and lease_until<now() and attempts<3)
      order by available_at for update skip locked limit 1;
    if not found then return null; end if;
    update public.interview_tasks set state='running',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '90 seconds',updated_at=now()
      where id=work.id returning * into work;
    return to_jsonb(work);
  end if;

  select * into work from public.interview_tasks where id=task;
  if not found then raise exception 'LEASE_LOST' using errcode='P0001'; end if;
  -- Same lock order as owner actions: interview first, then task.
  select * into item from public.interviews where id=work.interview_id for update;
  if not found then raise exception 'LEASE_LOST' using errcode='P0001'; end if;
  select * into work from public.interview_tasks where id=task for update;
  if not found or work.state<>'running' or work.lease_token is distinct from lease or work.lease_until<=now() then
    raise exception 'LEASE_LOST' using errcode='P0001';
  end if;
  if operation='heartbeat' then
    update public.interview_tasks set lease_until=now()+interval '90 seconds',progress=greatest(progress,least(99,coalesce((payload->>'progress')::integer,progress))),updated_at=now() where id=task;
    update public.interviews set status=case work.kind when 'transcribe' then 'transcribing' else 'analyzing' end,updated_at=now() where id=item.id;
    return jsonb_build_object('ok',true);
  elsif operation='chunks' then
    select coalesce(jsonb_agg(segment order by chunk_index),'[]') into result from private.interview_chunks where interview_id=item.id;
    return result;
  elsif operation='chunk' then
    if work.kind<>'transcribe' then raise exception 'STATE_CONFLICT' using errcode='P0001'; end if;
    insert into private.interview_chunks(interview_id,chunk_index,segment) values(item.id,(payload->>'index')::integer,payload->'segment') on conflict do nothing;
    return jsonb_build_object('ok',true);
  elsif operation='bill' then
    call_id:=(payload->>'id')::uuid;
    if exists(select 1 from private.interview_calls where id=call_id and task_id=task) then return jsonb_build_object('id',call_id); end if;
    estimated:=(payload->>'estimated_usd')::numeric; seconds_value:=(payload->>'audio_seconds')::numeric;
    if estimated is null or estimated not between 0 and 100 or seconds_value is null or seconds_value not between 0 and 7200 then raise exception 'INVALID_COST' using errcode='P0001'; end if;
    insert into private.interview_usage(user_id,period) values(item.user_id,period_value) on conflict do nothing;
    select * into limits_row from private.interview_limits where user_id=item.user_id;
    select * into usage_row from private.interview_usage where user_id=item.user_id and period=period_value for update;
    if usage_row.estimated_usd+estimated>limits_row.monthly_usd or usage_row.audio_seconds+seconds_value>limits_row.monthly_audio_seconds then raise exception 'QUOTA_EXCEEDED' using errcode='P0001'; end if;
    insert into private.interview_calls(id,user_id,task_id,period,estimated_usd,audio_seconds,model)
      values(call_id,item.user_id,task,period_value,estimated,seconds_value,left(payload->>'model',100));
    update private.interview_usage set estimated_usd=estimated_usd+estimated,audio_seconds=audio_seconds+seconds_value where user_id=item.user_id and period=period_value;
    return jsonb_build_object('id',call_id);
  elsif operation='settle' then
    select * into call_row from private.interview_calls where id=(payload->>'id')::uuid and task_id=task for update;
    if not found or call_row.status='complete' then return jsonb_build_object('ok',true); end if;
    estimated:=(payload->>'estimated_usd')::numeric;
    if estimated is null or estimated not between 0 and 100 or (payload->>'input_tokens')::bigint<0 or (payload->>'output_tokens')::bigint<0 then raise exception 'INVALID_COST' using errcode='P0001'; end if;
    update private.interview_usage set estimated_usd=greatest(0,estimated_usd-call_row.estimated_usd+estimated),
      input_tokens=input_tokens+coalesce((payload->>'input_tokens')::bigint,0),output_tokens=output_tokens+coalesce((payload->>'output_tokens')::bigint,0)
      where user_id=item.user_id and period=call_row.period;
    update private.interview_calls set status='complete',estimated_usd=estimated,
      input_tokens=coalesce((payload->>'input_tokens')::bigint,0),output_tokens=coalesce((payload->>'output_tokens')::bigint,0) where id=call_row.id;
    return jsonb_build_object('ok',true);
  elsif operation='complete' then
    if work.kind='transcribe' then
      if item.transcript_version<>0 then raise exception 'VERSION_CONFLICT' using errcode='P0001'; end if;
      insert into public.interview_transcripts(interview_id,version,segments) values(item.id,1,payload->'segments');
      update public.interviews set transcript_version=1,duration_seconds=(payload->>'duration')::numeric,status='review',error_code=null,updated_at=now() where id=item.id;
    else
      if item.transcript_version<>work.target_version then raise exception 'VERSION_CONFLICT' using errcode='P0001'; end if;
      select coalesce(max(revision),0)+1 into next_revision from public.interview_reports where interview_id=item.id;
      insert into public.interview_reports(interview_id,source_version,revision,body,author,model)
        values(item.id,work.target_version,next_revision,payload->'body','ai',payload->>'model');
      update public.interviews set status='complete',error_code=null,updated_at=now() where id=item.id;
    end if;
    update public.interview_tasks set state='done',progress=100,lease_token=null,lease_until=null,updated_at=now() where id=task;
    return jsonb_build_object('ok',true);
  elsif operation='fail' then
    update public.interview_tasks set state=case when payload->>'retry'='true' and attempts<3 then 'queued' else 'failed' end,
      available_at=now()+make_interval(secs=>least(300,attempts*30)),error_code=left(payload->>'code',60),lease_token=null,lease_until=null,updated_at=now()
      where id=task returning * into work;
    update public.interviews set status=case when work.state='queued' then case work.kind when 'report' then 'analyzing' else 'queued' end else 'failed' end,
      error_code=work.error_code,updated_at=now() where id=item.id;
    return jsonb_build_object('ok',true);
  else raise exception 'INVALID_ACTION' using errcode='P0001'; end if;
end $$;
revoke all on function public.interview_worker(text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.interview_worker(text,uuid,uuid,jsonb) to service_role;

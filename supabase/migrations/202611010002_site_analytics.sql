-- First-party analytics: no raw IP, email, URL query, document or recording data.
create table if not exists private.site_analytics_config (
  singleton boolean primary key default true check(singleton),
  started_at timestamptz not null default now(),
  cleaned_at timestamptz not null default now()
);
insert into private.site_analytics_config(singleton) values(true) on conflict do nothing;
create table if not exists private.site_events (
  id uuid primary key,
  occurred_at timestamptz not null default now(),
  visitor_key text not null check(visitor_key ~ '^[a-f0-9]{64}$'),
  user_key text check(user_key ~ '^[a-f0-9]{64}$'),
  event_type text not null check(event_type in (
    'page_view','job_click','category_click','application_link_click','search',
    'job_save','workspace_add','resume_save','resume_upload',
    'ai_interview_create','ai_report_request','mock_interest'
  )),
  page_key text not null check(page_key in (
    '/','/jobs','/jobs/:id','/jobs/calendar','/search','/login','/privacy',
    '/resume','/workspace','/workspace/favorites','/workspace/schedule','/workspace/settings',
    '/workspace/interviews','/workspace/interviews/new','/workspace/interviews/:id',
    '/workspace/interviews/:id/progress','/workspace/interviews/:id/transcript','/workspace/interviews/:id/report',
    '/interview-center','/interview-center/practice','/interview-center/mock',
    '/interview-center/notes','/interview-center/history','/interview-center/plan',
    '/resources','/resources/:slug','/resources/mine','/resources/store','/resources/radar'
  )),
  source text not null default 'direct' check(source in ('direct','internal','baidu','google','bing','wechat','social','referral')),
  job_id uuid references public.job_catalog(id) on delete set null,
  category text check(category in ('daily_internship','conversion_internship','autumn_recruitment','spring_recruitment')),
  keyword text check(char_length(keyword) between 1 and 32),
  provenance text not null check(provenance in ('client','server'))
);
create index if not exists site_events_time on private.site_events(occurred_at);
create index if not exists site_events_job_time on private.site_events(job_id,occurred_at);
create index if not exists site_events_visitor on private.site_events(visitor_key);
create index if not exists site_events_user on private.site_events(user_key) where user_key is not null;
alter table private.site_events enable row level security;
alter table private.site_analytics_config enable row level security;
revoke all on private.site_events,private.site_analytics_config from public,anon,authenticated;

create or replace function public.cleanup_site_analytics() returns integer
language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
  delete from private.site_events where occurred_at<now()-interval '90 days';
  get diagnostics removed=row_count;
  update private.site_analytics_config set cleaned_at=now() where singleton;
  return removed;
end $$;
revoke all on function public.cleanup_site_analytics() from public,anon,authenticated;
grant execute on function public.cleanup_site_analytics() to service_role;

create or replace function public.record_site_event(
  event_id uuid,visitor_hash text,user_hash text,event_name text,page text,
  traffic_source text,job uuid,job_category text,search_term text,event_provenance text
) returns void language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from private.site_analytics_config where singleton and cleaned_at<now()-interval '1 day')
    and pg_try_advisory_xact_lock(hashtextextended('shangan.analytics.cleanup',0)) then
    perform public.cleanup_site_analytics();
  end if;
  insert into private.site_events(id,visitor_key,user_key,event_type,page_key,source,job_id,category,keyword,provenance)
    values(event_id,visitor_hash,user_hash,event_name,page,traffic_source,job,job_category,search_term,event_provenance)
    on conflict(id) do nothing;
end $$;
revoke all on function public.record_site_event(uuid,text,text,text,text,text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.record_site_event(uuid,text,text,text,text,text,uuid,text,text,text) to service_role;

create or replace function public.erase_site_analytics(visitor_hash text default null,user_hash text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  delete from private.site_events where (visitor_hash is not null and visitor_key=visitor_hash)
    or (user_hash is not null and user_key=user_hash);
end $$;
revoke all on function public.erase_site_analytics(text,text) from public,anon,authenticated;
grant execute on function public.erase_site_analytics(text,text) to service_role;

-- One audit entry per real Auth session, even when a user reaches admin directly.
create table if not exists private.admin_login_sessions (
  session_id uuid primary key,user_id uuid not null references public.app_users(user_id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.admin_login_sessions enable row level security;
revoke all on private.admin_login_sessions from public,anon,authenticated;
create or replace function public.admin_record_login() returns void
language plpgsql security definer set search_path='' as $$
declare claims jsonb:=nullif(current_setting('request.jwt.claims',true),'')::jsonb; inserted integer;
begin
  if private.admin_role() is null then return; end if;
  if coalesce(claims->>'session_id','') !~ '^[a-f0-9-]{36}$' then return; end if;
  insert into private.admin_login_sessions(session_id,user_id)
    values((claims->>'session_id')::uuid,private.current_user_id()) on conflict do nothing;
  get diagnostics inserted=row_count;
  if inserted=1 then
    perform private.admin_event('admin_login',private.current_user_id(),null,null,null,null,'邮箱验证会话进入管理后台','system');
  end if;
end $$;
revoke all on function public.admin_record_login() from public,anon;
grant execute on function public.admin_record_login() to authenticated;

create or replace function public.admin_site_analytics(from_date date,to_date date) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; today date:=(now() at time zone 'Asia/Shanghai')::date;
begin
  perform private.require_admin(array['super_admin','editor','reviewer']);
  if from_date is null or to_date is null or from_date>to_date or to_date>today
    or from_date<today-89 or to_date-from_date>89 then
    raise exception 'ANALYTICS_RANGE' using errcode='22023';
  end if;
  with e as materialized (
    select * from private.site_events
    where occurred_at>=from_date::timestamp at time zone 'Asia/Shanghai'
      and occurred_at<(to_date+1)::timestamp at time zone 'Asia/Shanghai'
  ), daily as (
    select (occurred_at at time zone 'Asia/Shanghai')::date as bucket_day,
      count(*) filter(where event_type='page_view') pv,
      count(distinct visitor_key) filter(where event_type='page_view') uv,
      count(distinct user_key) active_users from e group by 1
  ), registrations as (
    select (created_at at time zone 'Asia/Shanghai')::date as bucket_day,count(*) new_users
    from public.app_users
    where created_at>=from_date::timestamp at time zone 'Asia/Shanghai'
      and created_at<(to_date+1)::timestamp at time zone 'Asia/Shanghai' group by 1
  ), job_metrics as (
    select job_id,
      count(*) filter(where event_type='page_view' and page_key='/jobs/:id') views,
      count(*) filter(where event_type='job_click') clicks,
      count(*) filter(where event_type='application_link_click') application_clicks,
      count(*) filter(where event_type='job_save') saves,
      count(*) filter(where event_type='workspace_add') workspace_adds
    from e where job_id is not null group by job_id
  )
  select jsonb_build_object(
    'meta',jsonb_build_object('from',from_date,'to',to_date,'timezone','Asia/Shanghai',
      'retentionDays',90,'searchMinVisitors',3,
      'startedAt',(select started_at from private.site_analytics_config where singleton)),
    'totals',jsonb_build_object(
      'pv',(select count(*) from e where event_type='page_view'),
      'uv',(select count(distinct visitor_key) from e where event_type='page_view'),
      'new_users',coalesce((select sum(new_users) from registrations),0),
      'active_users',(select count(distinct user_key) from e),
      'application_clicks',(select count(*) from e where event_type='application_link_click'),
      'job_saves',(select count(*) from e where event_type='job_save'),
      'workspace_adds',(select count(*) from e where event_type='workspace_add')),
    'trend',(select jsonb_agg(jsonb_build_object('day',d.bucket_day::date,'pv',coalesce(x.pv,0),'uv',coalesce(x.uv,0),
      'active_users',coalesce(x.active_users,0),'new_users',coalesce(r.new_users,0)) order by d.bucket_day)
      from generate_series(from_date::timestamp,to_date::timestamp,interval '1 day') d(bucket_day)
      left join daily x on x.bucket_day=d.bucket_day::date left join registrations r on r.bucket_day=d.bucket_day::date),
    'sources',coalesce((select jsonb_agg(to_jsonb(s)) from (
      select source,count(*) views from e where event_type='page_view' group by source order by views desc,source
    ) s),'[]'::jsonb),
    'pages',coalesce((select jsonb_agg(to_jsonb(p)) from (
      select page_key,count(*) views,count(distinct visitor_key) visitors from e where event_type='page_view'
      group by page_key order by views desc,page_key limit 10
    ) p),'[]'::jsonb),
    'categories',(select jsonb_agg(to_jsonb(c)) from (
      select k.category,
        count(*) filter(where event_type='page_view') views,
        count(*) filter(where event_type='page_view' and page_key='/jobs/:id') detail_views,
        count(*) filter(where event_type in ('job_click','category_click')) clicks,
        count(*) filter(where event_type='application_link_click') application_clicks,
        count(*) filter(where event_type='job_save') saves,
        count(*) filter(where event_type='workspace_add') workspace_adds
      from unnest(array['daily_internship','conversion_internship','autumn_recruitment','spring_recruitment']) k(category)
      left join e on e.category=k.category group by k.category order by k.category
    ) c),
    'jobs',coalesce((select jsonb_agg(to_jsonb(j)) from (
      select c.id,c.title,c.company,m.views,m.clicks,m.application_clicks,m.saves,m.workspace_adds
      from job_metrics m join public.job_catalog c on c.id=m.job_id order by m.views desc,m.clicks desc,c.id limit 10
    ) j),'[]'::jsonb),
    'companies',coalesce((select jsonb_agg(to_jsonb(c)) from (
      select j.company,sum(m.views) views,sum(m.clicks) clicks,sum(m.application_clicks) application_clicks
      from job_metrics m join public.job_catalog j on j.id=m.job_id group by j.company
      order by views desc,j.company limit 10
    ) c),'[]'::jsonb),
    'keywords',coalesce((select jsonb_agg(to_jsonb(k)) from (
      select keyword,count(*) searches,count(distinct visitor_key) visitors from e
      where event_type='search' and keyword is not null group by keyword
      having count(distinct visitor_key)>=3 order by searches desc,keyword limit 10
    ) k),'[]'::jsonb),
    'features',jsonb_build_object(
      'resume_views',(select count(*) from e where event_type='page_view' and page_key='/resume'),
      'resume_saves',(select count(*) from e where event_type='resume_save'),
      'resume_uploads',(select count(*) from e where event_type='resume_upload'),
      'ai_views',(select count(*) from e where event_type='page_view' and page_key like '/workspace/interviews%'),
      'ai_created',(select count(*) from e where event_type='ai_interview_create'),
      'ai_report_requests',(select count(*) from e where event_type='ai_report_request'),
      'mock_views',(select count(*) from e where event_type='page_view' and page_key='/interview-center/mock'),
      'mock_interest',(select count(*) from e where event_type='mock_interest')),
    'operations',coalesce((select jsonb_agg(to_jsonb(o)) from (
      select action,count(*) count from public.admin_audit_logs
      where created_at>=from_date::timestamp at time zone 'Asia/Shanghai'
        and created_at<(to_date+1)::timestamp at time zone 'Asia/Shanghai'
        and action in ('admin_login','draft_created','draft_saved','submit','approve','reject','publish','close','expire')
      group by action order by count desc,action
    ) o),'[]'::jsonb)
  ) into result;
  return result;
end $$;
revoke all on function public.admin_site_analytics(date,date) from public,anon;
grant execute on function public.admin_site_analytics(date,date) to authenticated;

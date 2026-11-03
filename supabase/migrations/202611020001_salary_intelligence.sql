-- Salary intelligence. No third-party records or fabricated seed salaries.
create table public.salary_companies(id uuid primary key default gen_random_uuid(), name text unique not null check(length(name) between 1 and 80), official_url text not null default '' check(official_url='' or official_url ~ '^https://[^/@ ]+'), updated_at timestamptz not null default now());
create table public.salary_role_aliases(alias text primary key check(length(alias) between 1 and 80), canonical_role text not null check(length(canonical_role) between 1 and 80));
create table public.salary_sources(id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 100), url text not null check(url ~ '^https://[^/@ ]+'), credibility text not null check(credibility in ('official','licensed')), authorization_note text not null check(length(authorization_note) between 10 and 500), active boolean not null default true);
create table public.salary_reports(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.app_users(user_id) on delete cascade,
company text not null check(length(company) between 1 and 80),
 role text not null check(length(role) between 1 and 80), city text not null check(length(city) between 1 and 80),
 cohort integer not null check(cohort between 2000 and 2100), education text not null check(education in ('专科','本科','硕士','博士','其他')),
 data_year integer not null check(data_year between 2000 and 2100), basis text not null check(basis in ('monthly','annual','daily')),
 base_salary numeric not null check(base_salary>0 and base_salary<=100000000), salary_months numeric not null default 12 check(salary_months between 1 and 24),
 bonus numeric check(bonus between 0 and 100000000), stock numeric check(stock between 0 and 100000000), subsidy numeric check(subsidy between 0 and 100000000),
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(basis='monthly' or salary_months=12), check(basis<>'daily' or (bonus is null and stock is null and subsidy is null)), state text not null default 'pending' check(state in ('pending','approved','rejected','hidden')),
 public_company_id uuid references public.salary_companies(id), public_role text check(length(public_role) between 1 and 80), public_city text check(length(public_city) between 1 and 80),
 source_id uuid references public.salary_sources(id), verification text not null default 'self_reported' check(verification in ('self_reported','source_checked')),
 moderation_note text not null default '' check(length(moderation_note)<=500),
 unique(user_id,company,role,city,cohort,education,data_year,basis));
create table public.personal_offers(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.app_users(user_id) on delete cascade,
company text not null check(length(company) between 1 and 80),
 role text not null check(length(role) between 1 and 80), city text not null check(length(city) between 1 and 80),
 cohort integer not null check(cohort between 2000 and 2100), education text not null check(education in ('专科','本科','硕士','博士','其他')),
 data_year integer not null check(data_year between 2000 and 2100), basis text not null check(basis in ('monthly','annual','daily')),
 base_salary numeric not null check(base_salary>0 and base_salary<=100000000), salary_months numeric not null default 12 check(salary_months between 1 and 24),
 bonus numeric check(bonus between 0 and 100000000), stock numeric check(stock between 0 and 100000000), subsidy numeric check(subsidy between 0 and 100000000),
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(basis='monthly' or salary_months=12), check(basis<>'daily' or (bonus is null and stock is null and subsidy is null)));
create table public.salary_verifications(id uuid primary key default gen_random_uuid(), report_id uuid not null references public.salary_reports(id) on delete cascade, reviewer_id uuid references public.app_users(user_id) on delete set null, version integer not null, result text not null, note text not null check(length(note) between 10 and 500), created_at timestamptz not null default now());
create table public.salary_moderation_logs(id uuid primary key default gen_random_uuid(), report_id uuid references public.salary_reports(id) on delete set null, actor_id uuid references public.app_users(user_id) on delete set null, action text not null, note text not null check(length(note)<=500), created_at timestamptz not null default now());
create table public.salary_complaints(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.app_users(user_id) on delete cascade, group_key text not null check(length(group_key) between 1 and 500), reason text not null check(length(reason) between 10 and 500), state text not null default 'pending' check(state in ('pending','resolved')), resolution text not null default '' check(length(resolution)<=500), created_at timestamptz not null default now());
create index salary_reports_review on public.salary_reports(state,created_at);
create index salary_reports_public on public.salary_reports(public_company_id,public_role,public_city,data_year) where state='approved';
create index salary_offers_owner on public.personal_offers(user_id);

create function private.salary_reset() returns trigger language plpgsql set search_path='' as $$
begin
 new.version:=old.version+1; new.updated_at:=now();
 -- Owner edits always withdraw the previous publication, including edits by an administrator to their own report.
 if tg_table_name='salary_reports' then
   new.state:='pending'; new.public_company_id:=null; new.public_role:=null; new.public_city:=null;
   new.verification:='self_reported'; new.source_id:=null; new.moderation_note:='';
 end if;
 return new;
end $$;
create trigger salary_owner_edit before update of company,role,city,cohort,education,data_year,basis,base_salary,salary_months,bonus,stock,subsidy on public.salary_reports for each row execute function private.salary_reset();
create trigger salary_offer_edit before update on public.personal_offers for each row execute function private.salary_reset();
alter table public.salary_companies enable row level security;
revoke all on public.salary_companies from anon,authenticated;
alter table public.salary_role_aliases enable row level security;
revoke all on public.salary_role_aliases from anon,authenticated;
alter table public.salary_sources enable row level security;
revoke all on public.salary_sources from anon,authenticated;
alter table public.salary_reports enable row level security;
revoke all on public.salary_reports from anon,authenticated;
alter table public.personal_offers enable row level security;
revoke all on public.personal_offers from anon,authenticated;
alter table public.salary_verifications enable row level security;
revoke all on public.salary_verifications from anon,authenticated;
alter table public.salary_moderation_logs enable row level security;
revoke all on public.salary_moderation_logs from anon,authenticated;
alter table public.salary_complaints enable row level security;
revoke all on public.salary_complaints from anon,authenticated;
grant select on public.salary_companies to anon,authenticated;
create policy salary_reference_read on public.salary_companies for select using(true);
grant select on public.salary_role_aliases to anon,authenticated;
create policy salary_reference_read on public.salary_role_aliases for select using(true);
grant select on public.salary_sources to anon,authenticated;
create policy salary_reference_read on public.salary_sources for select using(true);
grant select,delete on public.salary_reports to authenticated;
 grant insert(user_id,company,role,city,cohort,education,data_year,basis,base_salary,salary_months,bonus,stock,subsidy),update(company,role,city,cohort,education,data_year,basis,base_salary,salary_months,bonus,stock,subsidy) on public.salary_reports to authenticated;
 create policy salary_own_read on public.salary_reports for select to authenticated using(user_id=private.current_user_id());
 create policy salary_own_insert on public.salary_reports for insert to authenticated with check(user_id=private.current_user_id());
 create policy salary_own_update on public.salary_reports for update to authenticated using(user_id=private.current_user_id()) with check(user_id=private.current_user_id());
 create policy salary_own_delete on public.salary_reports for delete to authenticated using(user_id=private.current_user_id());
grant select,delete on public.personal_offers to authenticated;
 grant insert(user_id,company,role,city,cohort,education,data_year,basis,base_salary,salary_months,bonus,stock,subsidy),update(company,role,city,cohort,education,data_year,basis,base_salary,salary_months,bonus,stock,subsidy) on public.personal_offers to authenticated;
 create policy salary_own_read on public.personal_offers for select to authenticated using(user_id=private.current_user_id());
 create policy salary_own_insert on public.personal_offers for insert to authenticated with check(user_id=private.current_user_id());
 create policy salary_own_update on public.personal_offers for update to authenticated using(user_id=private.current_user_id()) with check(user_id=private.current_user_id());
 create policy salary_own_delete on public.personal_offers for delete to authenticated using(user_id=private.current_user_id());
create policy salary_staff_read on public.salary_reports for select to authenticated using(private.admin_role() is not null);
grant select on public.salary_verifications,public.salary_moderation_logs to authenticated;
create policy salary_staff_verifications on public.salary_verifications for select to authenticated using(private.admin_role() is not null);
create policy salary_staff_logs on public.salary_moderation_logs for select to authenticated using(private.admin_role() is not null);
grant select on public.salary_complaints to authenticated;
grant insert(user_id,group_key,reason) on public.salary_complaints to authenticated;
create policy salary_complaint_read on public.salary_complaints for select to authenticated using(user_id=private.current_user_id() or private.admin_role() is not null);
create policy salary_complaint_insert on public.salary_complaints for insert to authenticated with check(user_id=private.current_user_id());

-- Only fixed, predeclared cohort cells are released. Filters are applied AFTER aggregation,
-- never to underlying reports, preventing arbitrary subsets and differencing queries.
-- One contribution per person/cell; round to coarse amounts; suppress each metric under k=5.
create function public.salary_distribution() returns jsonb language sql stable security definer set search_path='' as $$
with contributors as (
 select distinct on (r.user_id,r.public_company_id,r.public_role,r.public_city,r.cohort,r.education,r.data_year,r.basis)
 r.*, c.name as company_name, s.name as source_name,s.url as source_url,s.credibility,
 case when r.basis='monthly' then r.base_salary*r.salary_months when r.basis='annual' then r.base_salary end as fixed,
 case when r.basis='monthly' then r.base_salary*r.salary_months+r.bonus+r.stock+r.subsidy when r.basis='annual' then r.base_salary+r.bonus+r.stock+r.subsidy end as total
 from public.salary_reports r join public.salary_companies c on c.id=r.public_company_id
 left join public.salary_sources s on s.id=r.source_id and s.active
 where r.state='approved' and (r.source_id is null or s.id is not null)
 order by r.user_id,r.public_company_id,r.public_role,r.public_city,r.cohort,r.education,r.data_year,r.basis,r.updated_at desc
), cells as (
 select company_name as company,public_role as role, public_city as city,cohort,education,data_year,basis,
 (count(*)/5)*5 as sample_floor,
 round((percentile_cont(0.25) within group(order by base_salary))::numeric/(case when basis='daily' then 50 else 1000 end))*(case when basis='daily' then 50 else 1000 end) as p25,
 round((percentile_cont(0.5) within group(order by base_salary))::numeric/(case when basis='daily' then 50 else 1000 end))*(case when basis='daily' then 50 else 1000 end) as median,
 round((percentile_cont(0.75) within group(order by base_salary))::numeric/(case when basis='daily' then 50 else 1000 end))*(case when basis='daily' then 50 else 1000 end) as p75,
 case when count(fixed)>=5 then round((percentile_cont(0.5) within group(order by fixed))::numeric/1000)*1000 end as fixed_median,
 case when count(total)>=5 then round((percentile_cont(0.5) within group(order by total))::numeric/1000)*1000 end as total_median,
 case when count(bonus)>=5 then round((percentile_cont(0.5) within group(order by bonus))::numeric/1000)*1000 end as bonus_median,
 case when count(stock)>=5 then round((percentile_cont(0.5) within group(order by stock))::numeric/1000)*1000 end as stock_median,
 case when count(subsidy)>=5 then round((percentile_cont(0.5) within group(order by subsidy))::numeric/1000)*1000 end as subsidy_median,
 case when count(salary_months)>=5 and basis='monthly' then percentile_cont(0.5) within group(order by salary_months) end as months_median,
 jsonb_agg(distinct jsonb_build_object('name',coalesce(source_name,'本站用户匿名投稿'),'url',source_url,'credibility',coalesce(credibility,'self_reported'),'verification',verification)) as sources
 from contributors group by company_name,public_role,public_city,cohort,education,data_year,basis having count(*)>=5
)
select coalesce(jsonb_agg(to_jsonb(cells)),'[]') from cells
$$;
revoke all on function public.salary_distribution() from public;
grant execute on function public.salary_distribution() to anon,authenticated;

create function public.salary_review(p_id uuid,p_version integer,p_state text,p_company uuid,p_role text,p_city text,p_source uuid,p_verified boolean,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare r public.salary_reports;
begin
 perform private.require_admin(array['super_admin','reviewer']);
 select * into r from public.salary_reports where id=p_id for update;
 if r.id is null or r.version is distinct from p_version then raise exception 'STALE' using errcode='40001'; end if;
 if r.user_id=private.current_user_id() then raise exception 'NO_SELF_REVIEW' using errcode='42501'; end if;
 if p_state is null or p_state not in ('approved','rejected','hidden') or coalesce(length(trim(p_note)),0) not between 10 and 500 then raise exception 'INVALID' using errcode='22023'; end if;
 if p_state='approved' and (not exists(select 1 from public.salary_companies where id=p_company) or coalesce(length(trim(p_role)),0) not between 1 and 80 or coalesce(length(trim(p_city)),0) not between 1 and 80 or (p_role||p_city) ~ '[@0-9]' or (p_source is not null and (p_verified is not true or not exists(select 1 from public.salary_sources where id=p_source and active)))) then raise exception 'INVALID_PUBLIC_LABEL_OR_SOURCE' using errcode='22023'; end if;
 update public.salary_reports set state=p_state,public_company_id=p_company,public_role=trim(p_role),public_city=trim(p_city),source_id=p_source,verification=case when p_verified then 'source_checked' else 'self_reported' end,moderation_note=trim(p_note),version=version+1,updated_at=now() where id=p_id;
 insert into public.salary_verifications(report_id,reviewer_id,version,result,note) values(p_id,private.current_user_id(),r.version,p_state,p_note);
 insert into public.salary_moderation_logs(report_id,actor_id,action,note) values(p_id,private.current_user_id(),p_state,p_note);
end $$;
revoke all on function public.salary_review(uuid,integer,text,uuid,text,text,uuid,boolean,text) from public;
grant execute on function public.salary_review(uuid,integer,text,uuid,text,text,uuid,boolean,text) to authenticated;

-- Reference/source maintenance and complaint resolution are audited and role checked in DB.
create function public.salary_manage(p_action text,p_payload jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_admin(array['super_admin','reviewer']);
 if p_action='company' then
 insert into public.salary_companies(name,official_url) values(trim(p_payload->>'name'),coalesce(p_payload->>'url','')) on conflict(name) do update set official_url=excluded.official_url,updated_at=now();
 elsif p_action='alias' then
 insert into public.salary_role_aliases(alias,canonical_role) values(trim(p_payload->>'alias'),trim(p_payload->>'canonical_role')) on conflict(alias) do update set canonical_role=excluded.canonical_role;
 elsif p_action='source' then
 insert into public.salary_sources(name,url,credibility,authorization_note) values(p_payload->>'name',p_payload->>'url',p_payload->>'credibility',p_payload->>'authorization_note');
 elsif p_action='source_toggle' then
 update public.salary_sources set active=(p_payload->>'active')::boolean where id=(p_payload->>'id')::uuid;
 elsif p_action='resolve' then
 if length(trim(p_payload->>'resolution'))<10 then raise exception 'INVALID' using errcode='22023'; end if;
 update public.salary_complaints set state='resolved',resolution=p_payload->>'resolution' where id=(p_payload->>'id')::uuid;
 else raise exception 'INVALID' using errcode='22023'; end if;
 insert into public.salary_moderation_logs(actor_id,action,note) values(private.current_user_id(),p_action,'参考数据维护或举报处理');
end $$;
revoke all on function public.salary_manage(text,jsonb) from public;
grant execute on function public.salary_manage(text,jsonb) to authenticated;
notify pgrst,'reload schema';

-- Bound authenticated submissions even if a caller bypasses the application API.
create function private.salary_quota() returns trigger language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,482));
 if tg_table_name='salary_reports' then select count(*) into n from public.salary_reports where user_id=new.user_id;
 elsif tg_table_name='personal_offers' then select count(*) into n from public.personal_offers where user_id=new.user_id;
 else select count(*) into n from public.salary_complaints where user_id=new.user_id and created_at>now()-interval '1 day'; end if;
 if n>=100 then raise exception 'SALARY_QUOTA' using errcode='23514'; end if;
 return new;
end $$;
create trigger salary_report_quota before insert on public.salary_reports for each row execute function private.salary_quota();
create trigger salary_offer_quota before insert on public.personal_offers for each row execute function private.salary_quota();
create trigger salary_complaint_quota before insert on public.salary_complaints for each row execute function private.salary_quota();
-- Preserve the installed site's cleanup behavior. AI interviews are optional and
-- must not become a prerequisite for salary intelligence.
do $preserve_cleanup$
declare existing_definition text;
begin
 if to_regprocedure('private.salary_previous_personal_data()') is null then
   if to_regprocedure('public.delete_my_personal_data()') is null then
     raise exception '缺少已有的个人数据清理函数，请先核查账号基础迁移。';
   end if;
   existing_definition:=pg_get_functiondef('public.delete_my_personal_data()'::regprocedure);
   if position('CREATE OR REPLACE FUNCTION public.delete_my_personal_data()' in existing_definition)<>1 then
     raise exception '无法安全保留已有个人数据清理函数，本次升级已停止。';
   end if;
   execute replace(existing_definition,
     'CREATE OR REPLACE FUNCTION public.delete_my_personal_data()',
     'CREATE OR REPLACE FUNCTION private.salary_previous_personal_data()');
 end if;
end $preserve_cleanup$;
revoke all on function private.salary_previous_personal_data() from public,anon,authenticated;
create or replace function public.delete_my_personal_data() returns void language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=private.current_user_id();
begin
 if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
 delete from public.salary_reports where user_id=owner_id;
 delete from public.personal_offers where user_id=owner_id;
 delete from public.salary_complaints where user_id=owner_id;
 perform private.salary_previous_personal_data();
end $$;
revoke all on function public.delete_my_personal_data() from public,anon;
grant execute on function public.delete_my_personal_data() to authenticated;

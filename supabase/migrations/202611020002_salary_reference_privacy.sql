-- Public source provenance never exposes internal licensing records.
revoke select on public.salary_sources from anon,authenticated;
grant select(id,name,url,credibility,active) on public.salary_sources to anon,authenticated;
create function public.salary_admin_summary() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.require_admin(array['super_admin','reviewer','editor']);
 select jsonb_build_object(
 'counts',(select coalesce(jsonb_object_agg(state,n),'{}') from (select state,count(*) as n from public.salary_reports group by state) s),
 'duplicates',(select coalesce(jsonb_agg(r.id),'[]') from (select * from public.salary_reports order by created_at desc limit 200) r where exists(
 select 1 from public.salary_reports x where x.id<>r.id and
 (x.company,x.role,x.city,x.cohort,x.education,x.data_year,x.basis,x.base_salary,x.salary_months,x.bonus,x.stock,x.subsidy)
 is not distinct from
 (r.company,r.role,r.city,r.cohort,r.education,r.data_year,r.basis,r.base_salary,r.salary_months,r.bonus,r.stock,r.subsidy)
 ))) into result;
 return result;
end $$;
revoke all on function public.salary_admin_summary() from public;
grant execute on function public.salary_admin_summary() to authenticated;
notify pgrst,'reload schema';

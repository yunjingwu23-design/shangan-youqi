-- Expand the status whitelist only. No user, record, note or existing status is rewritten.
-- A single DO statement is atomic and safe to run again in Supabase SQL Editor.
do $workspace_stages$
declare status_column smallint; item record;
begin
  if to_regclass('public.workspace_entries') is null then
    raise exception '请在已有求职工作台的 Supabase 项目中执行，workspace_entries 表不存在。';
  end if;
  select attnum into status_column from pg_attribute
    where attrelid='public.workspace_entries'::regclass and attname='status' and not attisdropped;
  if status_column is null then raise exception '求职记录缺少 status 字段，请先检查账号数据结构。'; end if;
  for item in select conname from pg_constraint
    where conrelid='public.workspace_entries'::regclass and contype='c' and conkey=array[status_column]
  loop
    execute format('alter table public.workspace_entries drop constraint %I',item.conname);
  end loop;
  alter table public.workspace_entries add constraint workspace_entries_status_check check(status in (
    'planned','applied','assessment','ai_interview',
    'interview_1','interview_2','interview_3','interview_4','interview_5',
    'oral_oc','offer','interview','closed'
  ));
end $workspace_stages$;

select exists(
  select 1 from pg_constraint where conrelid='public.workspace_entries'::regclass
    and conname='workspace_entries_status_check'
    and pg_get_constraintdef(oid) like '%assessment%'
    and pg_get_constraintdef(oid) like '%ai_interview%'
    and pg_get_constraintdef(oid) like '%interview_5%'
    and pg_get_constraintdef(oid) like '%oral_oc%'
) as workspace_stages_ok;

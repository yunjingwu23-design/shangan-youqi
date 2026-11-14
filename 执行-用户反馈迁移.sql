-- 在 Supabase SQL Editor 整段执行即可（可重复执行，不会重复建表）。
-- 用户反馈：前台匿名或登录用户均可提交，仅 service_role 可读写。

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(user_id) on delete set null,
  kind text not null check (kind in ('bug','suggestion','content','other')),
  content text not null check (char_length(content) between 4 and 2000),
  contact text check (contact is null or char_length(contact) between 2 and 120),
  page_path text check (page_path is null or char_length(page_path) <= 240),
  user_agent text check (user_agent is null or char_length(user_agent) <= 400),
  status text not null default 'new' check (status in ('new','reviewing','resolved','dismissed')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_feedback_status_time on public.user_feedback(status, created_at desc);
create index if not exists user_feedback_time on public.user_feedback(created_at desc);

alter table public.user_feedback enable row level security;
revoke all on public.user_feedback from public, anon, authenticated;
grant all on public.user_feedback to service_role;

comment on table public.user_feedback is '前台意见反馈，仅运营后台可读';

-- 验证：应当返回 0（表示普通用户无任何权限）
select has_table_privilege('anon', 'public.user_feedback', 'select') as anon_can_select;

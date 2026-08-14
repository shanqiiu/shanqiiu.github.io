-- ============================================================
-- 聊天室 Supabase 数据库结构
-- 在 Supabase Dashboard -> SQL Editor 中执行本文件即可
-- 适用：公开聊天室（任何人可读写，靠 RLS 控制）
-- ============================================================

-- 1. 房间表
create table if not exists public.rooms (
  id          text primary key,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- 2. 消息表
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  room_id    text not null references public.rooms (id) on delete cascade,
  user_id    text not null,
  user_name  text not null,
  content    text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

-- 3. 加速按房间+时间拉取历史消息
create index if not exists messages_room_created_idx
  on public.messages (room_id, created_at);

-- 4. 启用行级安全（RLS）
alter table public.messages enable row level security;
alter table public.rooms    enable row level security;

-- 5. 公开聊天室：所有人可读
drop policy if exists "rooms_select" on public.rooms;
create policy "rooms_select" on public.rooms
  for select using (true);

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (true);

-- 6. 所有人可发消息（仅限制字段，防越权写 id/created_at）
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (true);

-- 7. 预填默认房间（已存在则跳过）
insert into public.rooms (id, name, description) values
  ('general', '综合大厅', '闲聊各类话题'),
  ('tech',    '技术交流', '讨论技术问题'),
  ('random',  '随便聊聊', '想说什么就说什么')
on conflict (id) do nothing;

-- 8. 启用 Realtime：必须把表加入 supabase_realtime 发布，
--    否则订阅 postgres_changes 收不到 INSERT，跨设备无法实时同步。
--    （supabase_realtime 是 Supabase 默认发布，若已存在则跳过避免报错）
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ============================================================
-- 知识库：动态资源条目 + 管理员写入
-- ============================================================

create table if not exists public.knowledge_admins (
  email      text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_items (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(title) between 1 and 120),
  description      text not null default '' check (char_length(description) <= 500),
  content_markdown text not null default '',
  link             text not null default '',
  category_1       text not null,
  category_2       text not null,
  category_3       text not null default '',
  tags             text[] not null default '{}',
  item_type        text not null default 'external' check (item_type in ('article', 'tool', 'book', 'external')),
  status           text not null default 'published' check (status in ('draft', 'published')),
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists knowledge_items_status_created_idx
  on public.knowledge_items (status, created_at desc);

create index if not exists knowledge_items_category_idx
  on public.knowledge_items (category_1, category_2, category_3);

alter table public.knowledge_admins enable row level security;
alter table public.knowledge_items  enable row level security;

drop policy if exists "knowledge_admins_select_self" on public.knowledge_admins;
create policy "knowledge_admins_select_self" on public.knowledge_admins
  for select using (email = auth.jwt() ->> 'email');

drop policy if exists "knowledge_items_select_published" on public.knowledge_items;
create policy "knowledge_items_select_published" on public.knowledge_items
  for select using (
    status = 'published'
    or exists (
      select 1 from public.knowledge_admins a
      where a.email = auth.jwt() ->> 'email'
    )
  );

drop policy if exists "knowledge_items_admin_insert" on public.knowledge_items;
create policy "knowledge_items_admin_insert" on public.knowledge_items
  for insert with check (
    exists (
      select 1 from public.knowledge_admins a
      where a.email = auth.jwt() ->> 'email'
    )
  );

drop policy if exists "knowledge_items_admin_update" on public.knowledge_items;
create policy "knowledge_items_admin_update" on public.knowledge_items
  for update using (
    exists (
      select 1 from public.knowledge_admins a
      where a.email = auth.jwt() ->> 'email'
    )
  ) with check (
    exists (
      select 1 from public.knowledge_admins a
      where a.email = auth.jwt() ->> 'email'
    )
  );

drop policy if exists "knowledge_items_admin_delete" on public.knowledge_items;
create policy "knowledge_items_admin_delete" on public.knowledge_items
  for delete using (
    exists (
      select 1 from public.knowledge_admins a
      where a.email = auth.jwt() ->> 'email'
    )
  );

-- ============================================================
-- 今日访客统计（基于 IP 去重的当日独立访客数）
-- 由 Vercel Serverless Function (api/today-visitor.js) 调用 RPC 写入并计数。
-- 前端不接触数据库：函数用服务端 IP 算出哈希后调用 RPC，RPC 以 security definer 写入，
-- 不向匿名用户暴露表的直读写权限。
-- ============================================================

create table if not exists public.daily_visitors (
  day          date not null,
  visitor_hash text not null,
  primary key (day, visitor_hash)
);

create index if not exists daily_visitors_day_idx
  on public.daily_visitors (day);

create or replace function public.count_today_visitor(p_day date, p_hash text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
begin
  insert into public.daily_visitors (day, visitor_hash)
  values (p_day, p_hash)
  on conflict do nothing;
  select count(*) into total from public.daily_visitors where day = p_day;
  return total;
end;
$$;

-- 允许匿名（网站访客经服务端函数调用）与登录用户执行该 RPC；
-- 函数体以 definer 权限运行，不泄露表直权限。
grant execute on function public.count_today_visitor(date, text) to anon;
grant execute on function public.count_today_visitor(date, text) to authenticated;

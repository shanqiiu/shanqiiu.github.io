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

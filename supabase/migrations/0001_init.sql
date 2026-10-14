-- 독서해마 (Reading Hippocampus) — initial schema
--
-- Open commons model:
--   * Everyone can read everything.
--   * Anyone signed in (including Supabase Anonymous Sign-in) can add books,
--     TOC entries, bubbles and replies — everyone is a co-contributor.
--   * Rows can be edited/deleted only by the person who created them.
--   * Mailbox: a reply on your bubble drops a notification in your inbox.

-- ---------- tables ----------

-- 사람 = 닉네임 + 고유 색 (익명 로그인 사용자 포함)
create table profiles (
  id         uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  nickname   text not null check (char_length(btrim(nickname)) between 1 and 20),
  color      text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now()
);

create table books (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(btrim(title)) between 1 and 200),
  author     text check (char_length(author) <= 100),
  created_by uuid not null default auth.uid() references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
-- 같은 책이 여러 번 등록되지 않도록 (제목 + 저자, 대소문자·공백 무시)
create unique index books_unique_title_author
  on books (lower(btrim(title)), lower(btrim(coalesce(author, ''))));

-- 목차 트리: parent_id가 null이면 최상위(카테고리/부), 아니면 하위(장)
create table toc_nodes (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references books(id) on delete cascade,
  parent_id  uuid references toc_nodes(id) on delete cascade,
  title      text not null check (char_length(btrim(title)) between 1 and 200),
  position   int  not null default 0,
  created_by uuid not null default auth.uid() references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 말풍선: toc_node_id가 null이면 책 전체에 대한 말풍선
create table bubbles (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references books(id) on delete cascade,
  toc_node_id uuid references toc_nodes(id) on delete cascade,
  content     text not null check (char_length(btrim(content)) between 1 and 1000),
  color       text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  author_id   uuid not null default auth.uid() references profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table replies (
  id         uuid primary key default gen_random_uuid(),
  bubble_id  uuid not null references bubbles(id) on delete cascade,
  content    text not null check (char_length(btrim(content)) between 1 and 1000),
  author_id  uuid not null default auth.uid() references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 우체통
create table notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  bubble_id    uuid not null references bubbles(id) on delete cascade,
  reply_id     uuid not null references replies(id) on delete cascade,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index on toc_nodes (book_id);
create index on bubbles (book_id);
create index on replies (bubble_id);
create index on notifications (recipient_id, read_at);

-- ---------- mailbox trigger ----------
-- 내 말풍선에 다른 사람이 댓글을 달면 우체통으로 (내가 단 댓글은 제외)
create or replace function notify_bubble_author() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  select author_id into a from bubbles where id = new.bubble_id;
  if a is not null and a <> new.author_id then
    insert into notifications (recipient_id, bubble_id, reply_id)
    values (a, new.bubble_id, new.id);
  end if;
  return new;
end $$;

create trigger trg_notify_bubble_author
after insert on replies
for each row execute function notify_bubble_author();

-- ---------- RLS ----------
alter table profiles      enable row level security;
alter table books         enable row level security;
alter table toc_nodes     enable row level security;
alter table bubbles       enable row level security;
alter table replies       enable row level security;
alter table notifications enable row level security;

-- 읽기: 누구나
create policy profiles_read on profiles  for select using (true);
create policy books_read    on books     for select using (true);
create policy toc_read      on toc_nodes for select using (true);
create policy bubbles_read  on bubbles   for select using (true);
create policy replies_read  on replies   for select using (true);

-- 프로필: 본인 것만 생성/수정
create policy profiles_insert on profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on profiles for update to authenticated using (id = auth.uid());

-- 쓰기: 로그인(익명 포함)한 누구나, 본인 명의로만
create policy books_insert   on books     for insert to authenticated with check (created_by = auth.uid());
create policy toc_insert     on toc_nodes for insert to authenticated with check (created_by = auth.uid());
create policy bubbles_insert on bubbles   for insert to authenticated with check (author_id = auth.uid());
create policy replies_insert on replies   for insert to authenticated with check (author_id = auth.uid());

-- 수정/삭제: 작성자만
create policy books_update   on books     for update to authenticated using (created_by = auth.uid());
create policy books_delete   on books     for delete to authenticated using (created_by = auth.uid());
create policy toc_update     on toc_nodes for update to authenticated using (created_by = auth.uid());
create policy toc_delete     on toc_nodes for delete to authenticated using (created_by = auth.uid());
create policy bubbles_update on bubbles   for update to authenticated using (author_id = auth.uid());
create policy bubbles_delete on bubbles   for delete to authenticated using (author_id = auth.uid());
create policy replies_update on replies   for update to authenticated using (author_id = auth.uid());
create policy replies_delete on replies   for delete to authenticated using (author_id = auth.uid());

-- 우체통: 본인 것만 읽고, 읽음 처리
create policy notifications_read   on notifications for select to authenticated using (recipient_id = auth.uid());
create policy notifications_update on notifications for update to authenticated using (recipient_id = auth.uid());

-- ---------- realtime ----------
alter publication supabase_realtime add table books, toc_nodes, bubbles, replies, notifications;

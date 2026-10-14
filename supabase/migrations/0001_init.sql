-- Reading Mindmap: initial schema
-- Auth: owners sign in normally; link visitors use Supabase Anonymous Sign-in.
-- Everyone (owner + visitors) is an auth.users row, so auth.uid() works everywhere.

create extension if not exists pgcrypto;

-- 책 = 보드 1개
create table books (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  author       text,
  share_token  text not null unique default encode(gen_random_bytes(12), 'hex'),
  share_active boolean not null default true,
  created_at   timestamptz not null default now()
);

-- 보드별 참여자 정체성 (닉네임 + 고유 색)
create table participants (
  book_id    uuid not null references books(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  nickname   text not null check (char_length(nickname) between 1 and 20),
  color      text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  joined_at  timestamptz not null default now(),
  primary key (book_id, user_id)
);

-- 목차 트리 (카테고리 → 장)
create table toc_nodes (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references books(id) on delete cascade,
  parent_id  uuid references toc_nodes(id) on delete cascade,
  title      text not null,
  position   int  not null default 0,
  x          double precision not null default 0,
  y          double precision not null default 0
);

-- 말풍선 (질문/토의 거리). 참여자도 생성 가능.
create table bubbles (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references books(id) on delete cascade,
  toc_node_id uuid references toc_nodes(id) on delete set null,
  author_id   uuid not null references auth.users(id) on delete cascade,
  content     text not null check (char_length(content) <= 1000),
  color       text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  x           double precision not null default 0,
  y           double precision not null default 0,
  created_at  timestamptz not null default now()
);

-- 댓글/의견
create table replies (
  id         uuid primary key default gen_random_uuid(),
  bubble_id  uuid not null references bubbles(id) on delete cascade,
  author_id  uuid not null references auth.users(id) on delete cascade,
  content    text not null check (char_length(content) <= 1000),
  created_at timestamptz not null default now()
);

-- 우체통
create table notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  reply_id     uuid not null references replies(id) on delete cascade,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index on toc_nodes (book_id);
create index on bubbles (book_id);
create index on replies (bubble_id);
create index on notifications (recipient_id, read_at);

-- ---------- helpers ----------
create or replace function is_member(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from books where id = b and owner_id = auth.uid())
      or exists (select 1 from participants where book_id = b and user_id = auth.uid());
$$;

create or replace function is_owner(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from books where id = b and owner_id = auth.uid());
$$;

-- 공유 링크로 입장: 토큰이 유효하면 participants에 등록
create or replace function join_book(token text, nick text, col text) returns uuid
language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  select id into b from books where share_token = token and share_active;
  if b is null then raise exception 'invalid or inactive link'; end if;
  insert into participants (book_id, user_id, nickname, color)
  values (b, auth.uid(), nick, col)
  on conflict (book_id, user_id) do update set nickname = excluded.nickname, color = excluded.color;
  return b;
end $$;

-- 댓글 → 말풍선 작성자 우체통 (자기 글에 단 댓글은 제외)
create or replace function notify_bubble_author() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  select author_id into a from bubbles where id = new.bubble_id;
  if a is not null and a <> new.author_id then
    insert into notifications (recipient_id, reply_id) values (a, new.id);
  end if;
  return new;
end $$;

create trigger trg_notify after insert on replies
for each row execute function notify_bubble_author();

-- ---------- RLS ----------
alter table books         enable row level security;
alter table participants  enable row level security;
alter table toc_nodes     enable row level security;
alter table bubbles       enable row level security;
alter table replies       enable row level security;
alter table notifications enable row level security;

-- books
create policy books_read   on books for select using (is_member(id));
create policy books_insert on books for insert with check (owner_id = auth.uid());
create policy books_update on books for update using (owner_id = auth.uid());
create policy books_delete on books for delete using (owner_id = auth.uid());

-- participants
create policy part_read   on participants for select using (is_member(book_id));
create policy part_update on participants for update using (user_id = auth.uid());
create policy part_delete on participants for delete using (user_id = auth.uid() or is_owner(book_id));

-- toc_nodes: 읽기는 멤버, 쓰기는 주인
create policy toc_read  on toc_nodes for select using (is_member(book_id));
create policy toc_write on toc_nodes for all using (is_owner(book_id)) with check (is_owner(book_id));

-- bubbles: 멤버 누구나 생성, 수정은 작성자, 삭제는 작성자 또는 주인
create policy bub_read   on bubbles for select using (is_member(book_id));
create policy bub_insert on bubbles for insert with check (is_member(book_id) and author_id = auth.uid());
create policy bub_update on bubbles for update using (author_id = auth.uid());
create policy bub_delete on bubbles for delete using (author_id = auth.uid() or is_owner(book_id));

-- replies
create policy rep_read on replies for select
  using (is_member((select book_id from bubbles where id = bubble_id)));
create policy rep_insert on replies for insert
  with check (author_id = auth.uid() and is_member((select book_id from bubbles where id = bubble_id)));
create policy rep_delete on replies for delete
  using (author_id = auth.uid() or is_owner((select book_id from bubbles where id = bubble_id)));

-- notifications: 본인 것만
create policy noti_read   on notifications for select using (recipient_id = auth.uid());
create policy noti_update on notifications for update using (recipient_id = auth.uid());

-- Realtime (우체통, 보드 실시간 반영)
alter publication supabase_realtime add table notifications, bubbles, replies;

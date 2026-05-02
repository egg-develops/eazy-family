create table if not exists telegram_approved_chats (
  chat_id bigint primary key,
  paired_at timestamptz not null default now()
);

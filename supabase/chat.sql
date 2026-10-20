-- "Ask Sira": the seller's chat with Sira about one dispute (src/lib/chat.ts).
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

create table if not exists chat_messages (
  id bigint generated always as identity primary key,
  dispute_id text not null references disputes (id) on delete cascade,
  -- Whose conversation: 'seller:<seller id>' or 'demo:<random id per demo sign-in>'.
  owner_key text not null,
  -- A fresh conversation starts when the seller picks "Start fresh"; older ones are kept.
  conversation_id uuid not null,
  role text not null check (role in ('seller', 'sira')),
  content text not null,
  -- For Sira's replies: what kind of message it was, and whether it changed the drafts.
  intent text check (intent in ('question', 'revise', 'off_topic', 'blocked')),
  revised boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_lookup_idx on chat_messages (dispute_id, owner_key, created_at desc);

-- Only the server (secret key) touches this; no public access.
alter table chat_messages enable row level security;

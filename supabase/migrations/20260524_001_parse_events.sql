-- Parse event telemetry: logs raw input, AI result, and final user-confirmed
-- result for every EZCapture submission. was_corrected=true means the user
-- edited at least one key field (title/type/date/time) before confirming.
-- Write-only for authenticated users — no select policy so data stays private.

create table if not exists public.parse_events (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  raw_input   text        not null,
  ai_result   jsonb       not null,
  final_result jsonb      not null,
  was_corrected boolean   not null default false,
  locale      text,
  created_at  timestamptz not null default now()
);

alter table public.parse_events enable row level security;

create policy "parse_events_insert"
  on public.parse_events for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Stores admin-curated dialect normalization rules that can be updated
-- without a code deploy. Rows are fetched client-side at runtime and applied
-- on top of the hardcoded baseline in normalizeCHDE().
--
-- To add a fix after seeing an alert:
--   INSERT INTO dialect_normalizations (locale, pattern, replacement, notes)
--   VALUES ('de-CH', 'ässe', 'essen', 'found via dialect-alert 2026-06-01');

create table if not exists public.dialect_normalizations (
  id          bigint      generated always as identity primary key,
  locale      text        not null,             -- BCP-47 tag, e.g. 'de-CH'
  pattern     text        not null,             -- literal string or regex source
  replacement text        not null,
  is_regex    boolean     not null default false,
  flags       text        not null default 'gi', -- JS RegExp flags when is_regex=true
  notes       text,                              -- context / which alert triggered this
  created_at  timestamptz not null default now()
);

alter table public.dialect_normalizations enable row level security;

-- Authenticated clients can read (needed for client-side normalization cache)
create policy "dialect_normalizations_select"
  on public.dialect_normalizations
  for select
  to authenticated
  using (true);

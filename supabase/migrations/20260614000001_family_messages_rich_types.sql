-- Make the Family Channel a REAL shared channel.
--
-- The wired Family Channel (FamilyAgenda.tsx) historically stored messages in
-- per-user localStorage (synced to each user's own user_preferences), so they
-- never reached other members. We're moving it onto the existing shared
-- `family_messages` table (family-scoped, already in the realtime publication).
--
-- That table only had content + media_url, but the channel supports rich message
-- types (voice / image / location / document / event). Extend it to carry them.
-- Polls are intentionally NOT supported here: voting mutates a message's tallies,
-- which would need cross-member UPDATE rights + a votes table. Every other type
-- is append-only, which the existing INSERT/SELECT policies already cover.
-- Purely additive — safe to run on a live database.

ALTER TABLE public.family_messages
  ADD COLUMN IF NOT EXISTS type     TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- A location / event row legitimately has neither content nor media_url, so the
-- original "must have content OR media" guard no longer holds.
ALTER TABLE public.family_messages
  DROP CONSTRAINT IF EXISTS family_messages_message_check;

-- Constrain `type` to the known (append-only) message kinds (idempotent).
DO $$ BEGIN
  ALTER TABLE public.family_messages
    ADD CONSTRAINT family_messages_type_check
    CHECK (type IN ('text','voice','image','location','document','event'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- family_messages is already in supabase_realtime (20260430_001). Ensure UPDATE
-- payloads (e.g. poll votes) carry full rows for realtime consumers.
ALTER TABLE public.family_messages REPLICA IDENTITY FULL;

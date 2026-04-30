-- ── 1. Add media support to direct_messages ──────────────────────────────
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Allow image-only messages (no text required when media present)
ALTER TABLE public.direct_messages ALTER COLUMN content DROP NOT NULL;
ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_content_check;
ALTER TABLE public.direct_messages ADD CONSTRAINT direct_messages_message_check
  CHECK (
    (content IS NOT NULL AND char_length(content) BETWEEN 0 AND 2000)
    OR media_url IS NOT NULL
  );

-- ── 2. Family group chat ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  sender_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT        CHECK (content IS NULL OR char_length(content) <= 2000),
  media_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT family_messages_message_check CHECK (content IS NOT NULL OR media_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS family_messages_family_idx ON public.family_messages (family_id, created_at);

ALTER TABLE public.family_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_members_read_family_messages" ON public.family_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = family_messages.family_id
        AND fm.user_id = auth.uid()
        AND fm.is_active = true
    )
  );

CREATE POLICY "family_members_insert_family_messages" ON public.family_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = family_messages.family_id
        AND fm.user_id = auth.uid()
        AND fm.is_active = true
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.family_messages;

-- ── 3. Storage bucket for message media ──────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-media',
  'message-media',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload their own files
CREATE POLICY "auth_users_upload_message_media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Anyone can read (URLs contain user UUID — unguessable)
CREATE POLICY "public_read_message_media" ON storage.objects
  FOR SELECT USING (bucket_id = 'message-media');

-- Users can delete their own uploads
CREATE POLICY "users_delete_own_message_media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'message-media' AND (storage.foldername(name))[1] = auth.uid()::text);

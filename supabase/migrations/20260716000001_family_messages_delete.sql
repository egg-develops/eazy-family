-- Let a member delete their OWN channel messages (swipe-to-delete, journal-style).
-- Author-only keeps it safe; the UI only exposes the gesture on your own messages.
DROP POLICY IF EXISTS "Members can delete their own messages" ON public.family_messages;
CREATE POLICY "Members can delete their own messages"
  ON public.family_messages
  FOR DELETE
  USING (sender_id = auth.uid());

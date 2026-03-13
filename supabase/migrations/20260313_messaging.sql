-- Create conversations table (group chats and direct messages)
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'group', -- 'group' or 'direct'
  name text, -- NULL for direct messages
  description text,
  avatar_color text, -- Hex color for group avatar
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create conversation members (junction table)
CREATE TABLE public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT now(),
  last_read_at timestamp with time zone DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  media_url text, -- Optional media attachment (image, video, etc.)
  media_type text, -- image, video, audio, file
  is_edited boolean DEFAULT false,
  edited_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_conversation_members_user_id ON public.conversation_members(user_id);
CREATE INDEX idx_conversation_members_conversation_id ON public.conversation_members(conversation_id);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
-- Users can see conversations they're members of
CREATE POLICY "Users can view conversations they belong to"
  ON public.conversations FOR SELECT
  USING (
    id IN (
      SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
    )
  );

-- Users can create group conversations
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
  );

-- Only creator can update conversation details
CREATE POLICY "Creators can update conversation"
  ON public.conversations FOR UPDATE
  USING (
    created_by = auth.uid()
  );

-- RLS Policies for conversation_members
-- Users can see members of conversations they belong to
CREATE POLICY "Users can view members of their conversations"
  ON public.conversation_members FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
    )
  );

-- Only conversation members can add new members (via creator or admin)
CREATE POLICY "Members can add others to conversation"
  ON public.conversation_members FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
    )
  );

-- Users can remove themselves from conversations
CREATE POLICY "Users can remove themselves from conversation"
  ON public.conversation_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    conversation_id IN (
      SELECT conversation_id FROM public.conversations WHERE created_by = auth.uid()
    )
  );

-- RLS Policies for messages
-- Users can read messages in conversations they're members of
CREATE POLICY "Users can read messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
    )
  );

-- Users can only send messages to conversations they're members of
CREATE POLICY "Users can send messages to their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
    )
  );

-- Users can only edit their own messages
CREATE POLICY "Users can edit their own messages"
  ON public.messages FOR UPDATE
  USING (
    sender_id = auth.uid()
  );

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  USING (
    sender_id = auth.uid()
  );

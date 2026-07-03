-- Security & performance hardening (applied directly via supabase db query on 2026-07-03;
-- this file is the RECORD. Migration history is out of sync — do NOT 'db push' blindly.)

-- 1) 73 RLS policies: wrap auth.uid()/auth.role() in (SELECT …) — initplan, evaluated once per query instead of per row
ALTER POLICY "Authenticated users can upload files" ON storage.objects WITH CHECK (((bucket_id = 'user-uploads'::text) AND (( SELECT auth.uid() ) IS NOT NULL)));
ALTER POLICY "Users can update their own files" ON storage.objects USING (((bucket_id = 'user-uploads'::text) AND (( SELECT auth.uid() ) IS NOT NULL)));
ALTER POLICY "Users can delete their own files" ON storage.objects USING (((bucket_id = 'user-uploads'::text) AND (( SELECT auth.uid() ) IS NOT NULL)));
ALTER POLICY "Users can view their own family member record" ON public.family_members USING ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can view limited family member data in their family" ON public.family_members USING (((user_id <> ( SELECT auth.uid() )) AND user_belongs_to_family(( SELECT auth.uid() ), family_id)));
ALTER POLICY "Users can create their own tasks" ON public.tasks WITH CHECK ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can insert family members into their family" ON public.family_members WITH CHECK (((( SELECT auth.uid() ) = user_id) OR user_belongs_to_family(( SELECT auth.uid() ), family_id)));
ALTER POLICY "Users can update family members in their family" ON public.family_members USING (user_belongs_to_family(( SELECT auth.uid() ), family_id)) WITH CHECK (user_belongs_to_family(( SELECT auth.uid() ), family_id));
ALTER POLICY "Users can delete family members from their family" ON public.family_members USING (user_belongs_to_family(( SELECT auth.uid() ), family_id));
ALTER POLICY "Users can view invitations they sent" ON public.family_invitations USING ((( SELECT auth.uid() ) = inviter_id));
ALTER POLICY "Users can create invitations for their family" ON public.family_invitations WITH CHECK (user_belongs_to_family(( SELECT auth.uid() ), family_id));
ALTER POLICY "Users can update their own invitations" ON public.family_invitations USING ((( SELECT auth.uid() ) = inviter_id)) WITH CHECK ((( SELECT auth.uid() ) = inviter_id));
ALTER POLICY "Users can delete their own invitations" ON public.family_invitations USING ((( SELECT auth.uid() ) = inviter_id));
ALTER POLICY "Users can view their own tasks" ON public.tasks USING ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can update their own tasks" ON public.tasks USING ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can delete their own tasks" ON public.tasks USING ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can view families they belong to" ON public.families USING ((EXISTS ( SELECT 1
   FROM family_members
  WHERE ((family_members.family_id = families.id) AND (family_members.user_id = ( SELECT auth.uid() )) AND (family_members.is_active = true)))));
ALTER POLICY "Users can create their own family" ON public.families WITH CHECK ((( SELECT auth.uid() ) = created_by));
ALTER POLICY "Family members can update their family" ON public.families USING ((EXISTS ( SELECT 1
   FROM family_members
  WHERE ((family_members.family_id = families.id) AND (family_members.user_id = ( SELECT auth.uid() )) AND (family_members.is_active = true)))));
ALTER POLICY "Users can view their own events" ON public.events USING ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can create their own events" ON public.events WITH CHECK ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can leave groups" ON public.group_members USING ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can update their own events" ON public.events USING ((( SELECT auth.uid() ) = user_id)) WITH CHECK ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can delete their own events" ON public.events USING ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can view their own photos" ON public.photos USING ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can upload their own photos" ON public.photos WITH CHECK ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can update their own photos" ON public.photos USING ((( SELECT auth.uid() ) = user_id)) WITH CHECK ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can delete their own photos" ON public.photos USING ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Anyone can view public groups" ON public.groups USING (((is_public = true) OR (created_by = ( SELECT auth.uid() ))));
ALTER POLICY "Users can create groups" ON public.groups WITH CHECK ((( SELECT auth.uid() ) = created_by));
ALTER POLICY "Group creators can update their groups" ON public.groups USING ((( SELECT auth.uid() ) = created_by)) WITH CHECK ((( SELECT auth.uid() ) = created_by));
ALTER POLICY "Group creators can delete their groups" ON public.groups USING ((( SELECT auth.uid() ) = created_by));
ALTER POLICY "Users can join groups" ON public.group_members WITH CHECK ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Anyone can view active marketplace items" ON public.marketplace_items USING (((status = 'active'::text) OR (user_id = ( SELECT auth.uid() ))));
ALTER POLICY "Users can create marketplace items" ON public.marketplace_items WITH CHECK ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can update their own items" ON public.marketplace_items USING ((( SELECT auth.uid() ) = user_id)) WITH CHECK ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can delete their own items" ON public.marketplace_items USING ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can view referrals they made" ON public.referrals USING ((( SELECT auth.uid() ) = referrer_user_id));
ALTER POLICY "Users can view referrals for them" ON public.referrals USING ((( SELECT auth.uid() ) = referred_user_id));
ALTER POLICY "Users can create referrals" ON public.referrals WITH CHECK ((( SELECT auth.uid() ) = referred_user_id));
ALTER POLICY "Users can update own referrals" ON public.referrals USING (((( SELECT auth.uid() ) = referrer_user_id) OR (( SELECT auth.uid() ) = referred_user_id)));
ALTER POLICY "group_members_read_messages" ON public.group_messages USING ((EXISTS ( SELECT 1
   FROM group_members
  WHERE ((group_members.group_id = group_messages.group_id) AND (group_members.user_id = ( SELECT auth.uid() ))))));
ALTER POLICY "Users can insert own shopping history" ON public.shopping_purchase_history WITH CHECK ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "group_members_insert_messages" ON public.group_messages WITH CHECK (((( SELECT auth.uid() ) = user_id) AND (EXISTS ( SELECT 1
   FROM group_members
  WHERE ((group_members.group_id = group_messages.group_id) AND (group_members.user_id = ( SELECT auth.uid() )))))));
ALTER POLICY "Users can read messages they sent or received" ON public.direct_messages USING (((( SELECT auth.uid() ) = sender_id) OR (( SELECT auth.uid() ) = recipient_id)));
ALTER POLICY "Users can send messages" ON public.direct_messages WITH CHECK ((( SELECT auth.uid() ) = sender_id));
ALTER POLICY "Recipients can mark messages as read" ON public.direct_messages USING ((( SELECT auth.uid() ) = recipient_id)) WITH CHECK ((( SELECT auth.uid() ) = recipient_id));
ALTER POLICY "users_manage_own_preferences" ON public.user_preferences USING ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "family_members_read_family_messages" ON public.family_messages USING ((EXISTS ( SELECT 1
   FROM family_members fm
  WHERE ((fm.family_id = family_messages.family_id) AND (fm.user_id = ( SELECT auth.uid() )) AND (fm.is_active = true)))));
ALTER POLICY "family_members_insert_family_messages" ON public.family_messages WITH CHECK (((sender_id = ( SELECT auth.uid() )) AND (EXISTS ( SELECT 1
   FROM family_members fm
  WHERE ((fm.family_id = family_messages.family_id) AND (fm.user_id = ( SELECT auth.uid() )) AND (fm.is_active = true))))));
ALTER POLICY "auth_users_upload_message_media" ON storage.objects WITH CHECK (((bucket_id = 'message-media'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() ))::text)));
ALTER POLICY "users_delete_own_message_media" ON storage.objects USING (((bucket_id = 'message-media'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() ))::text)));
ALTER POLICY "Users view own ai usage" ON public.ai_usage_logs USING ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Admins view all ai usage" ON public.ai_usage_logs USING ((( SELECT p.is_admin
   FROM profiles p
  WHERE (p.user_id = ( SELECT auth.uid() ))) = true));
ALTER POLICY "Users insert page views" ON public.page_views WITH CHECK ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Admins view all page views" ON public.page_views USING ((( SELECT p.is_admin
   FROM profiles p
  WHERE (p.user_id = ( SELECT auth.uid() ))) = true));
ALTER POLICY "profiles_select" ON public.profiles USING (((( SELECT auth.uid() ) = user_id) OR (((( SELECT auth.jwt() ) ->> 'is_admin'::text))::boolean = true)));
ALTER POLICY "profiles_insert" ON public.profiles WITH CHECK ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "profiles_update" ON public.profiles USING ((( SELECT auth.uid() ) = user_id)) WITH CHECK ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "profiles_delete" ON public.profiles USING ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Users can read own shopping history" ON public.shopping_purchase_history USING ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Family members can create shared tasks" ON public.tasks WITH CHECK (((type = 'shared'::text) AND (family_id IS NOT NULL) AND user_belongs_to_family(( SELECT auth.uid() ), family_id)));
ALTER POLICY "Family members can update shared tasks" ON public.tasks USING (((type = 'shared'::text) AND (family_id IS NOT NULL) AND user_belongs_to_family(( SELECT auth.uid() ), family_id))) WITH CHECK (((type = 'shared'::text) AND (family_id IS NOT NULL) AND user_belongs_to_family(( SELECT auth.uid() ), family_id)));
ALTER POLICY "Family members can delete shared tasks" ON public.tasks USING (((type = 'shared'::text) AND (family_id IS NOT NULL) AND user_belongs_to_family(( SELECT auth.uid() ), family_id)));
ALTER POLICY "parse_events_insert" ON public.parse_events WITH CHECK ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "Family members can view shared shopping" ON public.tasks USING (((type = 'shopping'::text) AND (family_id IS NOT NULL) AND user_belongs_to_family(( SELECT auth.uid() ), family_id)));
ALTER POLICY "Family members can update shared shopping" ON public.tasks USING (((type = 'shopping'::text) AND (family_id IS NOT NULL) AND user_belongs_to_family(( SELECT auth.uid() ), family_id)));
ALTER POLICY "Family members can view shared tasks" ON public.tasks USING (((type = 'shared'::text) AND (family_id IS NOT NULL) AND user_belongs_to_family(( SELECT auth.uid() ), family_id) AND ((visible_to IS NULL) OR (visible_to = 'family'::text) OR ((visible_to = 'parents'::text) AND (EXISTS ( SELECT 1
   FROM family_members fm
  WHERE ((fm.user_id = ( SELECT auth.uid() )) AND (fm.family_id = tasks.family_id) AND (fm.role = ANY (ARRAY['parent'::family_member_role, 'grandparent'::family_member_role])) AND (fm.is_active = true))))))));
ALTER POLICY "parse_events_admin_select" ON public.parse_events USING ((( SELECT p.is_admin
   FROM profiles p
  WHERE (p.user_id = ( SELECT auth.uid() ))) = true));
ALTER POLICY "guide_queries_insert" ON public.guide_queries WITH CHECK ((( SELECT auth.uid() ) = user_id));
ALTER POLICY "guide_queries_admin_select" ON public.guide_queries USING ((( SELECT p.is_admin
   FROM profiles p
  WHERE (p.user_id = ( SELECT auth.uid() ))) = true));
ALTER POLICY "user_preferences_admin_select" ON public.user_preferences USING ((( SELECT p.is_admin
   FROM profiles p
  WHERE (p.user_id = ( SELECT auth.uid() ))) = true));
ALTER POLICY "Family members can delete shared shopping" ON public.tasks USING (((type = 'shopping'::text) AND (family_id IS NOT NULL) AND user_belongs_to_family(( SELECT auth.uid() ), family_id)));
-- ai_usage_logs: the INSERT policy was granted to PUBLIC with CHECK(true) —
-- any client could forge usage logs. Service role bypasses RLS and needs no policy.
DROP POLICY IF EXISTS "Service role insert ai usage" ON public.ai_usage_logs;
-- storage: anon-open write policies (no auth check at all) and enumeration
-- (broad SELECT on PUBLIC buckets — public URL access does not need SELECT).
DROP POLICY IF EXISTS "Allow deletes from user-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to user-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to user-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view uploaded files" ON storage.objects;
DROP POLICY IF EXISTS "Public Access for user-uploads" ON storage.objects;
DROP POLICY IF EXISTS "public_read_message_media" ON storage.objects;
-- user-uploads update/delete were "any signed-in user may touch ANY file";
-- scope to the uploader.
ALTER POLICY "Users can update their own files" ON storage.objects
  USING ((bucket_id = 'user-uploads'::text) AND (owner = ( SELECT auth.uid() )));
ALTER POLICY "Users can delete their own files" ON storage.objects
  USING ((bucket_id = 'user-uploads'::text) AND (owner = ( SELECT auth.uid() )));
-- duplicate index
DROP INDEX IF EXISTS public.idx_group_members_group_id;

-- Narrow SELECT so storage delete/update (which read first) still work — owner only, no enumeration
CREATE POLICY "Users can view their own files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id IN ('user-uploads','message-media') AND owner = ( SELECT auth.uid() ));

-- Pin search_path on SECURITY DEFINER-adjacent functions
ALTER FUNCTION public.generate_group_invite_code() SET search_path = public;
ALTER FUNCTION public.get_admin_stats() SET search_path = public;
ALTER FUNCTION public.get_storage_stats() SET search_path = public;
ALTER FUNCTION public.upsert_preference(p_user_id uuid, p_key text, p_value jsonb) SET search_path = public;

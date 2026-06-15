-- Required before October 30, 2026: Supabase is removing the implicit public-schema
-- grant for the Data API. This migration makes access explicit so PostgREST/supabase-js
-- continues to work after the platform default changes.

-- Schema usage (PostgREST needs this to introspect the schema)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Core app tables (authenticated users only)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_messages    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_messages   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_usage_logs     TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_purchase_history TO authenticated;

-- Analytics (anon can insert for pre-auth page tracking)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_views TO authenticated;
GRANT INSERT                          ON public.page_views TO anon;

-- RLS is still the actual security layer — these grants just let PostgREST see the tables.
-- Every table above should have RLS enabled with appropriate policies.

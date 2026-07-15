-- Family premium sharing: one member's subscription covers the whole in-app family.
--
-- Premium is decided per-user by RevenueCat on-device; the RC->Supabase webhook is
-- unreliable (a paying member's subscription_tier stayed 'free'), and we have no RC
-- secret key server-side. So this is CLIENT-AUTHORITATIVE: each member's app writes
-- its real RC entitlement expiry via set_my_premium_until(), and any member can ask
-- family_has_active_premium() whether someone in their active family is currently
-- paying. The client ORs that with its own RC entitlement.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_until timestamptz;

-- The caller records their OWN premium expiry (from RevenueCat). NULL = not premium.
-- SECURITY DEFINER so it doesn't depend on a broad profiles UPDATE policy; it can
-- only ever write the caller's own row.
CREATE OR REPLACE FUNCTION public.set_my_premium_until(_until timestamptz)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles SET premium_until = _until WHERE user_id = auth.uid();
END;
$function$;

-- True if the user, or any active member of their active family, is currently
-- premium (premium_until in the future). SECURITY DEFINER so it can read family
-- members' premium_until while returning only a boolean (no data leak).
CREATE OR REPLACE FUNCTION public.family_has_active_premium(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members me
    JOIN public.family_members fam
      ON fam.family_id = me.family_id AND fam.is_active
    JOIN public.profiles p
      ON p.user_id = fam.user_id
    WHERE me.user_id = _user_id
      AND me.is_active
      AND p.premium_until IS NOT NULL
      AND p.premium_until > now()
  );
$function$;

REVOKE ALL ON FUNCTION public.set_my_premium_until(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.family_has_active_premium(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_premium_until(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.family_has_active_premium(uuid) TO authenticated;

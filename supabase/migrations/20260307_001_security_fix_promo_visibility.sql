-- ====================================
-- SECURITY FIX 1: Lock Down Promo Code Visibility
-- ====================================
-- Remove the public SELECT policy that allowed all authenticated users to see promo codes
DROP POLICY IF EXISTS "Promo codes are viewable by authenticated users" ON public.promo_codes;

-- Promo code validation is now ONLY through the edge function (validate-promo-code)
-- which has its own authentication and validation logic.
-- No direct SELECT access from authenticated users.

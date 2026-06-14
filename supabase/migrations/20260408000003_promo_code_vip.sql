-- Ensure EZ-FAMILY-VIP promo code exists and is active
INSERT INTO public.promo_codes (code, subscription_tier, max_uses, expires_at, is_active)
VALUES ('EZ-FAMILY-VIP', 'family', NULL, NULL, true)
ON CONFLICT (code) DO UPDATE
  SET is_active = true,
      subscription_tier = 'family',
      max_uses = NULL,
      expires_at = NULL;

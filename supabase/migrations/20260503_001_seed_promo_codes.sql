-- Seed initial promo codes
INSERT INTO promo_codes (code, subscription_tier, max_uses, current_uses, is_active)
VALUES 
  ('EZ-FAMILY-VIP', 'family', NULL, 0, true),
  ('EAZYFAMILY', 'family', NULL, 0, true),
  ('BETA2026', 'family', 500, 0, true)
ON CONFLICT (code) DO NOTHING;

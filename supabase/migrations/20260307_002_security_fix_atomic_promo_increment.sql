-- ====================================
-- SECURITY FIX 2: Atomic Promo Code Increment
-- ====================================
-- Create a stored procedure that atomically validates and increments promo code usage
-- This prevents race conditions where concurrent requests bypass max_uses limits

CREATE OR REPLACE FUNCTION public.validate_and_increment_promo_code(
  _code text,
  _user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _promo RECORD;
  _result json;
BEGIN
  -- Lock the promo code row and check all conditions atomically
  SELECT * INTO _promo
  FROM promo_codes
  WHERE code = upper(trim(_code))
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  FOR UPDATE; -- Lock row to prevent concurrent updates

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid or expired promo code');
  END IF;

  -- Check max uses within the atomic transaction
  IF _promo.max_uses IS NOT NULL AND _promo.current_uses >= _promo.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'Promo code has reached maximum uses');
  END IF;

  -- Atomically increment current_uses
  UPDATE promo_codes
  SET 
    current_uses = current_uses + 1,
    updated_at = NOW()
  WHERE id = _promo.id;

  -- Return success with tier
  RETURN json_build_object(
    'valid', true,
    'subscription_tier', _promo.subscription_tier
  );
END;
$$;

-- Grant execute permission to authenticated users (edge function will call this)
GRANT EXECUTE ON FUNCTION public.validate_and_increment_promo_code(text, uuid) TO authenticated;

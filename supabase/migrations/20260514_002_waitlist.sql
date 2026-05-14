CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  referral_code TEXT NOT NULL UNIQUE DEFAULT substring(gen_random_uuid()::text, 1, 8),
  referred_by TEXT,
  signup_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can insert their own email
CREATE POLICY "anyone_can_join_waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);

-- Only service role can read (for admin/broadcast)
CREATE INDEX idx_waitlist_referral_code ON public.waitlist(referral_code);
CREATE INDEX idx_waitlist_referred_by ON public.waitlist(referred_by);

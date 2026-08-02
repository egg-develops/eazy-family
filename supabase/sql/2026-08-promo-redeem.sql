-- Working promo/VIP code redemption: validate a code and grant DURABLE premium
-- (referral_bonus_until — survives the RevenueCat sync and is family-shared).
-- Apply: supabase db query --linked -f supabase/sql/2026-08-promo-redeem.sql

-- Per-code grant duration (VIP = effectively lifetime).
alter table public.promo_codes add column if not exists grant_days integer not null default 365;
update public.promo_codes set grant_days = 3650 where code = 'EZ-FAMILY-VIP';

-- Track redemptions so a user can't redeem the same code twice.
create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  code text not null,
  redeemed_at timestamptz not null default now(),
  unique (user_id, code)
);
alter table public.promo_redemptions enable row level security;
drop policy if exists "own redemptions" on public.promo_redemptions;
create policy "own redemptions" on public.promo_redemptions for select using (auth.uid() = user_id);

create or replace function public.redeem_promo_code(_code text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  uid uuid := auth.uid();
  promo record;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'unauthenticated'); end if;
  _code := upper(btrim(coalesce(_code, '')));
  if _code = '' then return jsonb_build_object('ok', false, 'reason', 'empty'); end if;

  select * into promo from public.promo_codes
   where code = _code and is_active = true and (expires_at is null or expires_at > now())
   for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  if promo.max_uses is not null and promo.current_uses >= promo.max_uses then
    return jsonb_build_object('ok', false, 'reason', 'exhausted'); end if;
  if exists (select 1 from public.promo_redemptions where user_id = uid and code = _code) then
    return jsonb_build_object('ok', false, 'reason', 'already_redeemed'); end if;

  insert into public.promo_redemptions (user_id, code) values (uid, _code);
  update public.promo_codes set current_uses = current_uses + 1, updated_at = now() where id = promo.id;
  update public.profiles
     set referral_bonus_until = greatest(coalesce(referral_bonus_until, now()), now()) + make_interval(days => promo.grant_days)
   where user_id = uid;

  return jsonb_build_object('ok', true, 'days', promo.grant_days, 'tier', promo.subscription_tier);
end; $$;

grant execute on function public.redeem_promo_code(text) to authenticated;

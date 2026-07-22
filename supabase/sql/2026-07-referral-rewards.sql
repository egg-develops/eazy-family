-- Referral rewards: dual-sided 14-day trial bonus.
-- Apply with: supabase db query --linked -f supabase/sql/2026-07-referral-rewards.sql
-- (not migrations — this project's migration history is out of sync)

-- 1. Bonus expiry, SEPARATE from the RevenueCat-owned premium_until so the RC
--    sync (set_my_premium_until) never clobbers a referral bonus, and trials
--    still expire normally.
alter table public.profiles add column if not exists referral_bonus_until timestamptz;

-- 2. Idempotent referral code (replaces the race-prone client-side generation).
create or replace function public.get_or_create_my_referral_code()
returns text language plpgsql security definer set search_path to 'public' as $$
declare uid uuid := auth.uid(); code text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select referral_code into code from public.profiles where user_id = uid;
  if code is not null and code <> '' then return code; end if;
  loop
    code := 'EAZY' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  update public.profiles set referral_code = code where user_id = uid;
  return code;
end; $$;

-- 3. Redeem a code (called by the referee just after signup). Server-validated:
--    no self-referral, one redemption per referee (UNIQUE referred_user_id),
--    referrer reward capped to limit farming. Grants both sides +14 trial days.
create or replace function public.redeem_referral(_code text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  referee uuid := auth.uid();
  referrer uuid;
  bonus_days int := 14;
  reward_cap  int := 10;
  rewarded_count int;
begin
  if referee is null then return jsonb_build_object('ok', false, 'reason', 'unauthenticated'); end if;
  _code := upper(btrim(coalesce(_code, '')));
  if _code = '' then return jsonb_build_object('ok', false, 'reason', 'empty'); end if;

  select user_id into referrer from public.profiles where upper(referral_code) = _code;
  if referrer is null then return jsonb_build_object('ok', false, 'reason', 'invalid_code'); end if;
  if referrer = referee then return jsonb_build_object('ok', false, 'reason', 'self'); end if;
  if exists (select 1 from public.referrals where referred_user_id = referee) then
    return jsonb_build_object('ok', false, 'reason', 'already_referred');
  end if;

  insert into public.referrals (referrer_user_id, referred_user_id, referral_code, status, reward_applied)
  values (referrer, referee, _code, 'completed', true)
  on conflict (referred_user_id) do nothing;
  if not found then return jsonb_build_object('ok', false, 'reason', 'already_referred'); end if;

  update public.profiles
    set referral_bonus_until = greatest(coalesce(referral_bonus_until, now()), now()) + make_interval(days => bonus_days)
    where user_id = referee;

  select count(*) into rewarded_count from public.referrals
    where referrer_user_id = referrer and reward_applied;
  if rewarded_count <= reward_cap then
    update public.profiles
      set referral_bonus_until = greatest(coalesce(referral_bonus_until, now()), now()) + make_interval(days => bonus_days)
      where user_id = referrer;
  end if;

  return jsonb_build_object('ok', true, 'bonus_days', bonus_days);
end; $$;

-- 4. Honor the bonus in the existing family-premium check (additive OR — the
--    original premium_until logic is unchanged).
create or replace function public.family_has_active_premium(_user_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select
    exists (
      select 1 from public.profiles p
      where p.user_id = _user_id
        and ( (p.premium_until is not null and p.premium_until > now())
           or (p.referral_bonus_until is not null and p.referral_bonus_until > now()) )
    )
    or exists (
      select 1
      from public.family_members me
      join public.family_members fam on fam.family_id = me.family_id and fam.is_active
      join public.profiles p on p.user_id = fam.user_id
      where me.user_id = _user_id and me.is_active
        and ( (p.premium_until is not null and p.premium_until > now())
           or (p.referral_bonus_until is not null and p.referral_bonus_until > now()) )
    );
$$;

grant execute on function public.get_or_create_my_referral_code() to authenticated;
grant execute on function public.redeem_referral(text) to authenticated;

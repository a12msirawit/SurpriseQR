-- ============================================================================
-- apply_to_remote__god_pack_and_stacking.sql
-- ONE-SHOT script for the hosted Supabase project (nlklblswyobflsbafmfm):
-- adds the God Pack tier (269 THB) and the 60-day subscription stacking rules.
--
-- HOW TO APPLY (Option A - Supabase SQL Editor, recommended):
--   1. Supabase Dashboard -> SQL Editor -> New query
--   2. Paste this WHOLE file and click Run
--   3. Safe to re-run any time: every statement is idempotent
--      (DROP+CREATE / CREATE OR REPLACE). Existing users and VIPs are
--      untouched (rank guard).
--
-- CLI ALTERNATIVE (Option B - needs SUPABASE_ACCESS_TOKEN + DB password):
--   npx supabase link --project-ref nlklblswyobflsbafmfm
--   npx supabase migration list
--   # IMPORTANT: the remote DB predates CLI management. Mark every OLD
--   # migration as applied first, or `db push` will try to replay the whole
--   # history and fail:
--   npx supabase migration repair --status applied <version>   (per old version)
--   npx supabase db push                                       (applies 20260828*)
--
-- AFTER APPLYING: run the VERIFY block at the bottom of this file, then
-- retry the God Pack purchase on /topup.
-- ============================================================================

-- ============================================================================
-- 20260828000001 — Add God Pack & update 4-tier package specs
--
-- Introduces the `god` tier (God Pack, 269 THB) and corrects the guaranteed
-- per-package quotas for Starter / Value / Pro to match the final spec:
--
--   Package  Tier      Permanent  Custom URL  Premium
--   ---------------------------------------------------------------------
--   Starter  starter   2          2           1
--   Value    value     6          6           3
--   Pro      pro       8          8           6
--   God      god       ∞          ∞           10
--
-- Tier rank hierarchy (used as a rank guard so purchases never DOWNGRADE a
-- user, e.g. an existing `vip` can never be lowered):
--   free/guest = 0, starter = 1, value = 2, pro = 3, god = 4, vip = 5
--
-- Changes:
--   1) profiles_tier_check         -> allow `god`
--   2) payments_package_type_check -> allow `god_269`
--   3) approve_payment_transaction  (DROP + CREATE, re-grant service_role)
--   4) process_package_payment      (CREATE OR REPLACE, authenticated grant)
--   5) purchase_package_atomic      (CREATE OR REPLACE, authenticated grant)
--   6) reset_profile_quotas         (CREATE OR REPLACE)
--
-- IDEMPOTENCY: DROP-then-CREATE of the constraints + functions, safe both on
-- prod and on a fresh `supabase db reset`. All package-payment branches use
-- rank-safe tier upgrades (`CASE` rank guard) and clamp adds with LEAST(...).
-- Existing VIP users are untouched (rank 5 > every package rank).
-- ============================================================================

-- ============================================================================
-- SECTION 1 — profiles: allow `god` tier
-- ============================================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tier_check
  CHECK (tier IN ('guest', 'free', 'starter', 'value', 'pro', 'god', 'vip'));

-- ============================================================================
-- SECTION 2 — payments: allow `god_269` package type
-- ============================================================================
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_package_type_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_package_type_check
  CHECK (package_type IS NULL OR package_type IN ('starter_69', 'value_119', 'pro_199', 'god_269'));
-- ============================================================================
-- SECTION 3 — approve_payment_transaction
--   Single atomic approval grant (admin, service_role only). Updated package
--   branches + rank guard so a VIP / higher-pack user is never downgraded.
-- ============================================================================
DROP FUNCTION IF EXISTS public.approve_payment_transaction(UUID, UUID);

CREATE OR REPLACE FUNCTION public.approve_payment_transaction(
  p_payment_id UUID,
  p_admin_id   UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.payments%ROWTYPE;
  prof public.profiles%ROWTYPE;
  pkg_tier TEXT;
  permanent_add BIGINT;
  custom_url_add BIGINT;
  premium_add INTEGER;
  is_package BOOLEAN;
  is_plain_topup BOOLEAN;
  is_addon BOOLEAN;
  current_tier_rank INTEGER;
  package_tier_rank INTEGER;
  new_tier TEXT;
  new_expiry TIMESTAMPTZ;
  out_credits NUMERIC;
  out_tier TEXT;
  out_premium INTEGER;
  out_permanent INTEGER;
  out_custom INTEGER;
  out_expiry TIMESTAMPTZ;
BEGIN
  -- Load the pending payment and lock it.
  SELECT *
    INTO p
  FROM public.payments
   WHERE id = p_payment_id
     AND status = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % does not exist or is not pending', p_payment_id
    USING ERRCODE = 'P0002';
  END IF;

  -- Claim completeness (belt & braces; mirrors guard_payment_status_changes,
  -- which may not exist live). The approve route maps these messages to a 400.
  IF p.claimed_transfer_time IS NULL OR p.claimed_bank_account_last4 IS NULL THEN
    RAISE EXCEPTION 'Payment % cannot be approved: claimed_transfer_time and claimed_bank_account_last4 are required',
      p_payment_id;
  END IF;

  UPDATE public.payments
     SET status = 'approved',
         approved_at = NOW()
   WHERE id = p_payment_id;

  is_package     := p.package_type IS NOT NULL;
  is_plain_topup := p.payment_type = 'topup' AND NOT is_package;
  is_addon       := p.payment_type IN ('add_on_custom_url', 'add_on_permanent');

  -- Add credits for plain top-ups (payments.amount is NUMERIC(10,2); the only
  -- increment_credits overload since 20260826000004 is (UUID, INTEGER)).
  IF is_plain_topup THEN
    PERFORM public.increment_credits(p.user_id, ROUND(p.amount)::INTEGER);
  END IF;
-- Tier + quota upgrade for package payments.
  IF is_package THEN
    SELECT *
      INTO prof
    FROM public.profiles
     WHERE id = p.user_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Profile % does not exist', p.user_id
      USING ERRCODE = 'P0002';
    END IF;

    CASE p.package_type
      WHEN 'starter_69' THEN
        pkg_tier      := 'starter';
        permanent_add := 2;
        custom_url_add := 2;
        premium_add   := 1;
      WHEN 'value_119' THEN
        pkg_tier      := 'value';
        permanent_add := 6;
        custom_url_add := 6;
        premium_add   := 3;
      WHEN 'pro_199' THEN
        pkg_tier      := 'pro';
        permanent_add := 8;
        custom_url_add := 8;
        premium_add   := 6;
      WHEN 'god_269' THEN
        pkg_tier      := 'god';
        permanent_add := 2147483647;
        custom_url_add := 2147483647;
        premium_add   := 10;
      ELSE
        RAISE EXCEPTION 'Invalid package_type %', p.package_type;
    END CASE;

    -- Rank-safe tier upgrade: never downgrade (e.g. vip must stay vip).
    current_tier_rank := CASE prof.tier
      WHEN 'starter' THEN 1
      WHEN 'value'   THEN 2
      WHEN 'pro'     THEN 3
      WHEN 'god'     THEN 4
      WHEN 'vip'     THEN 5
      ELSE 0
    END;
    package_tier_rank := CASE pkg_tier
      WHEN 'starter' THEN 1
      WHEN 'value'   THEN 2
      WHEN 'pro'     THEN 3
      WHEN 'god'     THEN 4
      ELSE 0
    END;
    new_tier := CASE
      WHEN package_tier_rank > current_tier_rank THEN pkg_tier
      ELSE prof.tier
    END;

    -- Package duration: extend an active window by 30 days, otherwise start a
    -- fresh 30-day window (mirrors purchase_package_atomic).
    IF prof.quota_expires_at IS NOT NULL AND prof.quota_expires_at > NOW() THEN
      new_expiry := prof.quota_expires_at + INTERVAL '30 days';
    ELSE
      new_expiry := NOW() + INTERVAL '30 days';
    END IF;

    -- god fills the quotas to the cap via its additive branch (existing +
    -- 2147483647 clamped by LEAST), matching the previous unlimited rule.
    UPDATE public.profiles
       SET tier = new_tier,
           permanent_quota = LEAST(2147483647::BIGINT, prof.permanent_quota::BIGINT + permanent_add::BIGINT)::INTEGER,
           custom_url_quota = LEAST(2147483647::BIGINT, prof.custom_url_quota::BIGINT + custom_url_add::BIGINT)::INTEGER,
           premium_quota = LEAST(2147483647::BIGINT, prof.premium_quota::BIGINT + premium_add::BIGINT)::INTEGER,
           quota_expires_at = new_expiry
     WHERE id = p.user_id;
  END IF;
-- Apply add-on entitlements (permanent-url / permanent-storage).
  IF is_addon THEN
    PERFORM public.apply_approved_add_on(p_payment_id);
  END IF;

  -- Immutable audit row.
  INSERT INTO public.admin_action_logs
       (admin_id, action, payment_id, payment_user_id, amount, reason)
  VALUES (p_admin_id, 'payment_approved', p.id, p.user_id, p.amount, NULL);

  -- Enriched snapshot of the grantee's profile so the admin UI can display the
  -- updated credits/quotas/package duration straight from this transaction.
  SELECT credits, tier, premium_quota, permanent_quota, custom_url_quota, quota_expires_at
    INTO out_credits, out_tier, out_premium, out_permanent, out_custom, out_expiry
  FROM public.profiles
   WHERE id = p.user_id;

  RETURN json_build_object(
    'success', TRUE,
    'amount', p.amount,
    'payment_type', p.payment_type,
    'package_type', p.package_type,
    'credits', out_credits,
    'tier', out_tier,
    'premium_quota', out_premium,
    'permanent_quota', out_permanent,
    'custom_url_quota', out_custom,
    'quota_expires_at', out_expiry
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Let the whole transaction (status flip included) roll back atomically.
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payment_transaction(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_payment_transaction(UUID, UUID) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.approve_payment_transaction(UUID, UUID) TO service_role;
-- ============================================================================
-- SECTION 4 — process_package_payment (authenticated purchase, direct RPC)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_package_payment(p_package_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  profile_row public.profiles%ROWTYPE;
  package_price NUMERIC;
  package_tier TEXT;
  package_permanent_quota INTEGER;
  package_custom_url_quota INTEGER;
  package_premium_quota INTEGER;
  current_tier_rank INTEGER;
  package_tier_rank INTEGER;
  new_tier TEXT;
  new_expiry TIMESTAMPTZ;
  new_permanent_quota INTEGER;
  new_custom_url_quota INTEGER;
  new_premium_quota INTEGER;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT *
  INTO profile_row
  FROM public.profiles
  WHERE id = caller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- TODO: replace with packages table join
  CASE lower(trim(p_package_id))
    WHEN 'starter', 'starter_69', 'package_69', '69' THEN
      package_price := 69;
      package_tier := 'starter';
      package_permanent_quota := 2;
      package_custom_url_quota := 2;
      package_premium_quota := 1;
    WHEN 'value', 'value_119', 'package_119', '119' THEN
      package_price := 119;
      package_tier := 'value';
      package_permanent_quota := 6;
      package_custom_url_quota := 6;
      package_premium_quota := 3;
    WHEN 'pro', 'pro_199', 'package_199', '199' THEN
      package_price := 199;
      package_tier := 'pro';
      package_permanent_quota := 8;
      package_custom_url_quota := 8;
      package_premium_quota := 6;
    WHEN 'god', 'god_269', 'package_269', '269' THEN
      package_price := 269;
      package_tier := 'god';
      package_permanent_quota := 2147483647;
      package_custom_url_quota := 2147483647;
      package_premium_quota := 10;
    ELSE
      RAISE EXCEPTION 'Invalid package';
  END CASE;
IF profile_row.credits < package_price THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  current_tier_rank := CASE profile_row.tier
    WHEN 'starter' THEN 1
    WHEN 'value' THEN 2
    WHEN 'pro' THEN 3
    WHEN 'god' THEN 4
    WHEN 'vip' THEN 5
    ELSE 0
  END;
  package_tier_rank := CASE package_tier
    WHEN 'starter' THEN 1
    WHEN 'value' THEN 2
    WHEN 'pro' THEN 3
    WHEN 'god' THEN 4
    ELSE 0
  END;
  new_tier := CASE
    WHEN package_tier_rank > current_tier_rank THEN package_tier
    ELSE profile_row.tier
  END;

  IF profile_row.quota_expires_at IS NOT NULL AND profile_row.quota_expires_at > NOW() THEN
    new_expiry := profile_row.quota_expires_at + INTERVAL '30 days';
  ELSE
    new_expiry := NOW() + INTERVAL '30 days';
  END IF;

  new_permanent_quota := LEAST(2147483647::BIGINT, profile_row.permanent_quota::BIGINT + package_permanent_quota::BIGINT)::INTEGER;
  new_custom_url_quota := LEAST(2147483647::BIGINT, profile_row.custom_url_quota::BIGINT + package_custom_url_quota::BIGINT)::INTEGER;
  new_premium_quota := LEAST(2147483647::BIGINT, profile_row.premium_quota::BIGINT + package_premium_quota::BIGINT)::INTEGER;

  -- NOTE: the legacy `IF package_price = 199 THEN ... unlimited` override has
  -- been REMOVED — Pro is no longer unlimited (8/8/6). God fills to the cap
  -- via its 2147483647 adds above.

  UPDATE public.profiles
  SET credits = profile_row.credits - package_price,
      tier = new_tier,
      permanent_quota = new_permanent_quota,
      custom_url_quota = new_custom_url_quota,
      premium_quota = new_premium_quota,
      quota_expires_at = new_expiry
  WHERE id = caller_id
  RETURNING * INTO profile_row;

  RETURN row_to_json(profile_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_package_payment(TEXT) TO authenticated;
-- ============================================================================
-- SECTION 5 — purchase_package_atomic (authenticated, idempotent)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.purchase_package_atomic(
  p_package_type TEXT,
  p_idempotency_key TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  profile_row public.profiles%ROWTYPE;
  existing_purchase public.package_purchases%ROWTYPE;
  package_price NUMERIC(12, 2);
  package_tier TEXT;
  permanent_add INTEGER;
  custom_url_add INTEGER;
  premium_add INTEGER;
  current_tier_rank INTEGER;
  package_tier_rank INTEGER;
  new_tier TEXT;
  new_expiry TIMESTAMPTZ;
  new_permanent_quota INTEGER;
  new_custom_url_quota INTEGER;
  new_premium_quota INTEGER;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF COALESCE(BTRIM(p_idempotency_key), '') IS NULL THEN
    RAISE EXCEPTION 'Idempotency key is required';
  END IF;

  SELECT *
  INTO profile_row
  FROM public.profiles
  WHERE id = caller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT *
  INTO existing_purchase
  FROM public.package_purchases
  WHERE user_id = caller_id
    AND idempotency_key = BTRIM(p_idempotency_key)
  LIMIT 1;

  IF FOUND THEN
    RETURN row_to_json(profile_row);
  END IF;

  CASE LOWER(BTRIM(p_package_type))
    WHEN 'starter', 'starter_69', 'package_69', '69' THEN
      package_price := 69;
      package_tier := 'starter';
      permanent_add := 2;
      custom_url_add := 2;
      premium_add := 1;
    WHEN 'value', 'value_119', 'package_119', '119' THEN
      package_price := 119;
      package_tier := 'value';
      permanent_add := 6;
      custom_url_add := 6;
      premium_add := 3;
    WHEN 'pro', 'pro_199', 'package_199', '199' THEN
      package_price := 199;
      package_tier := 'pro';
      permanent_add := 8;
      custom_url_add := 8;
      premium_add := 6;
    WHEN 'god', 'god_269', 'package_269', '269' THEN
      package_price := 269;
      package_tier := 'god';
      permanent_add := 2147483647;
      custom_url_add := 2147483647;
      premium_add := 10;
    ELSE
      RAISE EXCEPTION 'Invalid package';
  END CASE;
IF profile_row.credits < package_price THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  current_tier_rank := CASE profile_row.tier
    WHEN 'starter' THEN 1
    WHEN 'value' THEN 2
    WHEN 'pro' THEN 3
    WHEN 'god' THEN 4
    WHEN 'vip' THEN 5
    ELSE 0
  END;
  package_tier_rank := CASE package_tier
    WHEN 'starter' THEN 1
    WHEN 'value' THEN 2
    WHEN 'pro' THEN 3
    WHEN 'god' THEN 4
    ELSE 0
  END;
  new_tier := CASE
    WHEN package_tier_rank > current_tier_rank THEN package_tier
    ELSE profile_row.tier
  END;

  IF profile_row.quota_expires_at IS NOT NULL AND profile_row.quota_expires_at > NOW() THEN
    new_expiry := profile_row.quota_expires_at + INTERVAL '30 days';
  ELSE
    new_expiry := NOW() + INTERVAL '30 days';
  END IF;

  new_permanent_quota := LEAST(2147483647::BIGINT, profile_row.permanent_quota::BIGINT + permanent_add::BIGINT)::INTEGER;
  new_custom_url_quota := LEAST(2147483647::BIGINT, profile_row.custom_url_quota::BIGINT + custom_url_add::BIGINT)::INTEGER;
  new_premium_quota := LEAST(2147483647::BIGINT, profile_row.premium_quota::BIGINT + premium_add::BIGINT)::INTEGER;

  -- The old `IF package_price = 199 THEN ... unlimited` override is removed:
  -- Pro is now 8/8/6, and God fills to the cap via its 2147483647 adds.

  UPDATE public.profiles
  SET credits = profile_row.credits - package_price,
      tier = new_tier,
      permanent_quota = new_permanent_quota,
      custom_url_quota = new_custom_url_quota,
      premium_quota = new_premium_quota,
      quota_expires_at = new_expiry
  WHERE id = caller_id
  RETURNING * INTO profile_row;

  INSERT INTO public.package_purchases (user_id, package_type, amount, idempotency_key)
  VALUES (caller_id, LOWER(BTRIM(p_package_type)), package_price, BTRIM(p_idempotency_key));

  RETURN row_to_json(profile_row);
EXCEPTION
  WHEN unique_violation THEN
    SELECT *
    INTO profile_row
    FROM public.profiles
    WHERE id = caller_id;
    RETURN row_to_json(profile_row);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_package_atomic(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_package_atomic(TEXT, TEXT) TO authenticated;
-- ============================================================================
-- SECTION 6 — reset_profile_quotas (monthly reset per current tier)
--   God grants unlimited storage/URLs + 10 premium; Pro becomes 8/8/6.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_profile_quotas(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_tier TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT tier INTO current_tier FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  UPDATE public.profiles
  SET custom_url_quota = CASE current_tier
                            WHEN 'guest' THEN 0
                            WHEN 'free' THEN 0
                            WHEN 'starter' THEN 2
                            WHEN 'value' THEN 6
                            WHEN 'pro' THEN 8
                            WHEN 'god' THEN 2147483647
                            ELSE 2147483647 END,
      premium_quota = CASE current_tier
                            WHEN 'starter' THEN 1
                            WHEN 'value' THEN 3
                            WHEN 'pro' THEN 6
                            WHEN 'god' THEN 10
                            ELSE 0 END,
      permanent_quota = CASE current_tier
                            WHEN 'guest' THEN 0
                            WHEN 'free' THEN 0
                            WHEN 'starter' THEN 2
                            WHEN 'value' THEN 6
                            WHEN 'pro' THEN 8
                            WHEN 'god' THEN 2147483647
                            ELSE 2147483647 END,
      quota_reset_at = date_trunc('month', NOW())
  WHERE id = p_user_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
-- ============================[ end of 20260828000001 | next: 20260828000002 ]====

-- ============================================================================
-- 20260828000002 — Subscription day-stacking rules (60-day cap) + expiry reset
--
-- Refines the package day calculation introduced in 20260828000001:
--
--   Stacking Cap    : each purchase adds +30 days to an active window, but the
--                     total window can NEVER exceed NOW() + 60 days:
--                       new_expiry = LEAST(current_expiry + 30d, NOW() + 60d)
--
--   Cumulative      : permanent_quota / custom_url_quota / premium_quota are
--                     PERMANENT ACCUMULATED balances. Every purchase ADDS (+)
--                     its base quotas; they are never reset or cleared.
--
--   Rank Guard      : `tier` is upgraded only when the purchased package rank
--                     is higher; otherwise the current (higher) tier is
--                     retained. Purchased-package quotas always ADD to totals.
--
--   Expiry Handling : media entitlement is lazily evaluated (app reads
--                     quota_expires_at); quotas are never zeroed on expiry.
--
-- Functions republished (full bodies, idempotent DROP/CREATE pattern):
--   1) approve_payment_transaction  (DROP + CREATE, service_role only)
--   2) process_package_payment      (CREATE OR REPLACE, authenticated)
--   3) purchase_package_atomic      (CREATE OR REPLACE, authenticated)
--   4) reset_profile_quotas         (CREATE OR REPLACE, self-invoked)
-- ============================================================================

-- ============================================================================
-- SECTION 1 — approve_payment_transaction
--   (admin approval path; service_role only). Same grant logic as
--   20260828000001 plus the 60-day stacking cap and the cumulative model.
-- ============================================================================
DROP FUNCTION IF EXISTS public.approve_payment_transaction(UUID, UUID);

CREATE OR REPLACE FUNCTION public.approve_payment_transaction(
  p_payment_id UUID,
  p_admin_id   UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.payments%ROWTYPE;
  prof public.profiles%ROWTYPE;
  pkg_tier TEXT;
  permanent_add BIGINT;
  custom_url_add BIGINT;
  premium_add INTEGER;
  is_package BOOLEAN;
  is_plain_topup BOOLEAN;
  is_addon BOOLEAN;
  current_tier_rank INTEGER;
  package_tier_rank INTEGER;
  new_tier TEXT;
  new_expiry TIMESTAMPTZ;
  out_credits NUMERIC;
  out_tier TEXT;
  out_premium INTEGER;
  out_permanent INTEGER;
  out_custom INTEGER;
  out_expiry TIMESTAMPTZ;
BEGIN
  -- Load the pending payment and lock it.
  SELECT *
    INTO p
  FROM public.payments
   WHERE id = p_payment_id
     AND status = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % does not exist or is not pending', p_payment_id
    USING ERRCODE = 'P0002';
  END IF;

  -- Claim completeness (belt & braces; mirrors guard_payment_status_changes,
  -- which may not exist live). The approve route maps these messages to a 400.
  IF p.claimed_transfer_time IS NULL OR p.claimed_bank_account_last4 IS NULL THEN
    RAISE EXCEPTION 'Payment % cannot be approved: claimed_transfer_time and claimed_bank_account_last4 are required',
      p_payment_id;
  END IF;

  UPDATE public.payments
     SET status = 'approved',
         approved_at = NOW()
   WHERE id = p_payment_id;

  is_package     := p.package_type IS NOT NULL;
  is_plain_topup := p.payment_type = 'topup' AND NOT is_package;
  is_addon       := p.payment_type IN ('add_on_custom_url', 'add_on_permanent');

  -- Add credits for plain top-ups (payments.amount is NUMERIC(10,2); the only
  -- increment_credits overload since 20260826000004 is (UUID, INTEGER)).
  IF is_plain_topup THEN
    PERFORM public.increment_credits(p.user_id, ROUND(p.amount)::INTEGER);
  END IF;
-- Tier + quota upgrade for package payments.
  IF is_package THEN
    SELECT *
      INTO prof
    FROM public.profiles
     WHERE id = p.user_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Profile % does not exist', p.user_id
      USING ERRCODE = 'P0002';
    END IF;

    -- Cumulative model: permanent_quota / custom_url_quota / premium_quota are
    -- PERMANENT ACCUMULATED balances — never reset or cleared on expiry. The
    -- media-entitlement downgrade (window lapsed) is evaluated lazily by the
    -- app against quota_expires_at; a purchase simply ADDs its base quotas to
    -- the accumulated totals below.

    CASE p.package_type
      WHEN 'starter_69' THEN
        pkg_tier      := 'starter';
        permanent_add := 2;
        custom_url_add := 2;
        premium_add   := 1;
      WHEN 'value_119' THEN
        pkg_tier      := 'value';
        permanent_add := 6;
        custom_url_add := 6;
        premium_add   := 3;
      WHEN 'pro_199' THEN
        pkg_tier      := 'pro';
        permanent_add := 8;
        custom_url_add := 8;
        premium_add   := 6;
      WHEN 'god_269' THEN
        pkg_tier      := 'god';
        permanent_add := 2147483647;
        custom_url_add := 2147483647;
        premium_add   := 10;
      ELSE
        RAISE EXCEPTION 'Invalid package_type %', p.package_type;
    END CASE;

    -- Rank-safe tier upgrade: never downgrade (e.g. vip must stay vip).
    current_tier_rank := CASE prof.tier
      WHEN 'starter' THEN 1
      WHEN 'value'   THEN 2
      WHEN 'pro'     THEN 3
      WHEN 'god'     THEN 4
      WHEN 'vip'     THEN 5
      ELSE 0
    END;
    package_tier_rank := CASE pkg_tier
      WHEN 'starter' THEN 1
      WHEN 'value'   THEN 2
      WHEN 'pro'     THEN 3
      WHEN 'god'     THEN 4
      ELSE 0
    END;
    new_tier := CASE
      WHEN package_tier_rank > current_tier_rank THEN pkg_tier
      ELSE prof.tier
    END;

    -- Day stacking: an ACTIVE window (quota_expires_at > NOW()) is extended by
    -- +30 days, hard-capped so the total never exceeds NOW() + 60 days;
    -- lapsed/NULL windows start a fresh NOW() + 30 day window. (The final
    -- cumulative migration records the purchased tier as package_tier.)
    IF prof.quota_expires_at IS NOT NULL
       AND prof.quota_expires_at > NOW() THEN
      new_expiry := LEAST(
        prof.quota_expires_at + INTERVAL '30 days',
        NOW() + INTERVAL '60 days');
    ELSE
      new_expiry := NOW() + INTERVAL '30 days';
    END IF;

    -- god fills the quotas to the cap via its additive branch (existing +
    -- 2147483647 clamped by LEAST), matching the previous unlimited rule.
    UPDATE public.profiles
       SET tier = new_tier,
           permanent_quota = LEAST(2147483647::BIGINT, prof.permanent_quota::BIGINT + permanent_add::BIGINT)::INTEGER,
           custom_url_quota = LEAST(2147483647::BIGINT, prof.custom_url_quota::BIGINT + custom_url_add::BIGINT)::INTEGER,
           premium_quota = LEAST(2147483647::BIGINT, prof.premium_quota::BIGINT + premium_add::BIGINT)::INTEGER,
           quota_expires_at = new_expiry
     WHERE id = p.user_id;
  END IF;
-- Apply add-on entitlements (permanent-url / permanent-storage).
  IF is_addon THEN
    PERFORM public.apply_approved_add_on(p_payment_id);
  END IF;

  -- Immutable audit row.
  INSERT INTO public.admin_action_logs
       (admin_id, action, payment_id, payment_user_id, amount, reason)
  VALUES (p_admin_id, 'payment_approved', p.id, p.user_id, p.amount, NULL);

  -- Enriched snapshot of the grantee's profile so the admin UI can display the
  -- updated credits/quotas/package duration straight from this transaction.
  SELECT credits, tier, premium_quota, permanent_quota, custom_url_quota, quota_expires_at
    INTO out_credits, out_tier, out_premium, out_permanent, out_custom, out_expiry
  FROM public.profiles
   WHERE id = p.user_id;

  RETURN json_build_object(
    'success', TRUE,
    'amount', p.amount,
    'payment_type', p.payment_type,
    'package_type', p.package_type,
    'credits', out_credits,
    'tier', out_tier,
    'premium_quota', out_premium,
    'permanent_quota', out_permanent,
    'custom_url_quota', out_custom,
    'quota_expires_at', out_expiry
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Let the whole transaction (status flip included) roll back atomically.
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payment_transaction(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_payment_transaction(UUID, UUID) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.approve_payment_transaction(UUID, UUID) TO service_role;

-- ============================================================================
-- SECTION 2 — process_package_payment (authenticated wallet purchase RPC)
--   Same stacking cap + cumulative model as Section 1.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_package_payment(p_package_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  profile_row public.profiles%ROWTYPE;
  package_price NUMERIC;
  package_tier TEXT;
  package_permanent_quota INTEGER;
  package_custom_url_quota INTEGER;
  package_premium_quota INTEGER;
  current_tier_rank INTEGER;
  package_tier_rank INTEGER;
  new_tier TEXT;
  new_expiry TIMESTAMPTZ;
  new_permanent_quota INTEGER;
  new_custom_url_quota INTEGER;
  new_premium_quota INTEGER;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT *
  INTO profile_row
  FROM public.profiles
  WHERE id = caller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Cumulative model: quotas are PERMANENT ACCUMULATED balances and are never
  -- reset or cleared on expiry; only the media window is time-boxed (app
  -- evaluates quota_expires_at lazily). Purchases always ADD to the totals.
-- TODO: replace with packages table join
  CASE lower(trim(p_package_id))
    WHEN 'starter', 'starter_69', 'package_69', '69' THEN
      package_price := 69;
      package_tier := 'starter';
      package_permanent_quota := 2;
      package_custom_url_quota := 2;
      package_premium_quota := 1;
    WHEN 'value', 'value_119', 'package_119', '119' THEN
      package_price := 119;
      package_tier := 'value';
      package_permanent_quota := 6;
      package_custom_url_quota := 6;
      package_premium_quota := 3;
    WHEN 'pro', 'pro_199', 'package_199', '199' THEN
      package_price := 199;
      package_tier := 'pro';
      package_permanent_quota := 8;
      package_custom_url_quota := 8;
      package_premium_quota := 6;
    WHEN 'god', 'god_269', 'package_269', '269' THEN
      package_price := 269;
      package_tier := 'god';
      package_permanent_quota := 2147483647;
      package_custom_url_quota := 2147483647;
      package_premium_quota := 10;
    ELSE
      RAISE EXCEPTION 'Invalid package';
  END CASE;

  IF profile_row.credits < package_price THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  current_tier_rank := CASE profile_row.tier
    WHEN 'starter' THEN 1
    WHEN 'value' THEN 2
    WHEN 'pro' THEN 3
    WHEN 'god' THEN 4
    WHEN 'vip' THEN 5
    ELSE 0
  END;
  package_tier_rank := CASE package_tier
    WHEN 'starter' THEN 1
    WHEN 'value' THEN 2
    WHEN 'pro' THEN 3
    WHEN 'god' THEN 4
    ELSE 0
  END;
  new_tier := CASE
    WHEN package_tier_rank > current_tier_rank THEN package_tier
    ELSE profile_row.tier
  END;

  -- Day stacking: +30 days on an active window (capped at NOW() + 60 days);
  -- lapsed/NULL windows start a fresh NOW() + 30 day window.
  IF profile_row.quota_expires_at IS NOT NULL
     AND profile_row.quota_expires_at > NOW() THEN
    new_expiry := LEAST(
      profile_row.quota_expires_at + INTERVAL '30 days',
      NOW() + INTERVAL '60 days');
  ELSE
    new_expiry := NOW() + INTERVAL '30 days';
  END IF;

  new_permanent_quota := LEAST(2147483647::BIGINT, profile_row.permanent_quota::BIGINT + package_permanent_quota::BIGINT)::INTEGER;
  new_custom_url_quota := LEAST(2147483647::BIGINT, profile_row.custom_url_quota::BIGINT + package_custom_url_quota::BIGINT)::INTEGER;
  new_premium_quota := LEAST(2147483647::BIGINT, profile_row.premium_quota::BIGINT + package_premium_quota::BIGINT)::INTEGER;

  UPDATE public.profiles
  SET credits = profile_row.credits - package_price,
      tier = new_tier,
      permanent_quota = new_permanent_quota,
      custom_url_quota = new_custom_url_quota,
      premium_quota = new_premium_quota,
      quota_expires_at = new_expiry
  WHERE id = caller_id
  RETURNING * INTO profile_row;

  RETURN row_to_json(profile_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_package_payment(TEXT) TO authenticated;

-- ============================================================================
-- SECTION 3 — purchase_package_atomic (authenticated, idempotent)
--   Same stacking cap + cumulative model as Sections 1-2.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.purchase_package_atomic(
  p_package_type TEXT,
  p_idempotency_key TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  profile_row public.profiles%ROWTYPE;
  existing_purchase public.package_purchases%ROWTYPE;
  package_price NUMERIC(12, 2);
  package_tier TEXT;
  permanent_add INTEGER;
  custom_url_add INTEGER;
  premium_add INTEGER;
  current_tier_rank INTEGER;
  package_tier_rank INTEGER;
  new_tier TEXT;
  new_expiry TIMESTAMPTZ;
  new_permanent_quota INTEGER;
  new_custom_url_quota INTEGER;
  new_premium_quota INTEGER;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF COALESCE(BTRIM(p_idempotency_key), '') IS NULL THEN
    RAISE EXCEPTION 'Idempotency key is required';
  END IF;

  SELECT *
  INTO profile_row
  FROM public.profiles
  WHERE id = caller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT *
  INTO existing_purchase
  FROM public.package_purchases
  WHERE user_id = caller_id
    AND idempotency_key = BTRIM(p_idempotency_key)
  LIMIT 1;

  IF FOUND THEN
    RETURN row_to_json(profile_row);
  END IF;

  -- Cumulative model: quotas are PERMANENT and never downgraded/zeroed on
  -- expiry; the media window is time-boxed and evaluated lazily by the app.
  -- Idempotent replays return early above, so this runs at most once.

  CASE LOWER(BTRIM(p_package_type))
    WHEN 'starter', 'starter_69', 'package_69', '69' THEN
      package_price := 69;
      package_tier := 'starter';
      permanent_add := 2;
      custom_url_add := 2;
      premium_add := 1;
    WHEN 'value', 'value_119', 'package_119', '119' THEN
      package_price := 119;
      package_tier := 'value';
      permanent_add := 6;
      custom_url_add := 6;
      premium_add := 3;
    WHEN 'pro', 'pro_199', 'package_199', '199' THEN
      package_price := 199;
      package_tier := 'pro';
      permanent_add := 8;
      custom_url_add := 8;
      premium_add := 6;
    WHEN 'god', 'god_269', 'package_269', '269' THEN
      package_price := 269;
      package_tier := 'god';
      permanent_add := 2147483647;
      custom_url_add := 2147483647;
      premium_add := 10;
    ELSE
      RAISE EXCEPTION 'Invalid package';
  END CASE;

  IF profile_row.credits < package_price THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  current_tier_rank := CASE profile_row.tier
    WHEN 'starter' THEN 1
    WHEN 'value' THEN 2
    WHEN 'pro' THEN 3
    WHEN 'god' THEN 4
    WHEN 'vip' THEN 5
    ELSE 0
  END;
  package_tier_rank := CASE package_tier
    WHEN 'starter' THEN 1
    WHEN 'value' THEN 2
    WHEN 'pro' THEN 3
    WHEN 'god' THEN 4
    ELSE 0
  END;
  new_tier := CASE
    WHEN package_tier_rank > current_tier_rank THEN package_tier
    ELSE profile_row.tier
  END;

  -- Day stacking: +30 days on an active window (capped at NOW() + 60 days);
  -- lapsed/NULL windows start a fresh NOW() + 30 day window.
  IF profile_row.quota_expires_at IS NOT NULL
     AND profile_row.quota_expires_at > NOW() THEN
    new_expiry := LEAST(
      profile_row.quota_expires_at + INTERVAL '30 days',
      NOW() + INTERVAL '60 days');
  ELSE
    new_expiry := NOW() + INTERVAL '30 days';
  END IF;

  new_permanent_quota := LEAST(2147483647::BIGINT, profile_row.permanent_quota::BIGINT + permanent_add::BIGINT)::INTEGER;
  new_custom_url_quota := LEAST(2147483647::BIGINT, profile_row.custom_url_quota::BIGINT + custom_url_add::BIGINT)::INTEGER;
  new_premium_quota := LEAST(2147483647::BIGINT, profile_row.premium_quota::BIGINT + premium_add::BIGINT)::INTEGER;

  UPDATE public.profiles
  SET credits = profile_row.credits - package_price,
      tier = new_tier,
      permanent_quota = new_permanent_quota,
      custom_url_quota = new_custom_url_quota,
      premium_quota = new_premium_quota,
      quota_expires_at = new_expiry
  WHERE id = caller_id
  RETURNING * INTO profile_row;

  INSERT INTO public.package_purchases (user_id, package_type, amount, idempotency_key)
  VALUES (caller_id, LOWER(BTRIM(p_package_type)), package_price, BTRIM(p_idempotency_key));

  RETURN row_to_json(profile_row);
EXCEPTION
  WHEN unique_violation THEN
    SELECT *
    INTO profile_row
    FROM public.profiles
    WHERE id = caller_id;
    RETURN row_to_json(profile_row);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_package_atomic(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_package_atomic(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- SECTION 4 — reset_profile_quotas
--   Cumulative model: permanent/premium/custom_url quotas are PERMANENT and are
--   NEVER reset here (or on expiry). Media-entitlement expiry is evaluated by
--   the application layer against quota_expires_at; nothing is zeroed in the
--   DB. This only marks the monthly interval as processed.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_profile_quotas(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Not allowed'; END IF;

  UPDATE public.profiles
     SET quota_reset_at = date_trunc('month', NOW())
   WHERE id = p_user_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
-- ============================================================================
-- SECTION 7 (FINAL) — Cumulative quotas + time-boxed media entitlement
--
-- Correct entitlement model:
--   * permanent_quota / custom_url_quota / premium_quota are PERMANENT
--     ACCUMULATED balances. Every package purchase ADDS (+) its base quotas to
--     existing totals (LEAST-clamped at INT_MAX) and they are NEVER reset or
--     cleared on package expiry.
--   * package_tier + package_expires_at are the ACTIVE time-boxed package
--     governing media limits + priority. When the window has lapsed
--     (package_expires_at <= NOW()) or is NULL, media falls back to free-tier
--     defaults while all accumulated quotas remain.
--   * Active stacking: +30 days capped at NOW() + 60 days; otherwise fresh
--     NOW() + 30 days. package_tier is set to the newly purchased tier.
--
--   SQL is idempotent (CREATE OR REPLACE) and overrides any earlier version in
--   this file.
-- ============================================================================

-- --- active package columns + backfill (see Step-1 for the model) ---
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS package_tier TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS package_expires_at TIMESTAMPTZ;

UPDATE public.profiles
   SET package_tier = CASE WHEN tier IN ('starter', 'value', 'pro', 'god')
                           THEN tier ELSE package_tier END,
       package_expires_at = CASE WHEN quota_expires_at IS NOT NULL
                                 THEN quota_expires_at ELSE package_expires_at END
 WHERE package_tier IS NULL OR package_expires_at IS NULL;

-- ============================================================================
-- SECTION 7.1 — approve_payment_transaction (admin approval; service_role)
--   Single-flight (FOR UPDATE on the pending row) -> idempotent. Quotas
--   accumulate; package_tier/package_expires_at are set.
-- ============================================================================
DROP FUNCTION IF EXISTS public.approve_payment_transaction(UUID, UUID);

CREATE OR REPLACE FUNCTION public.approve_payment_transaction(
  p_payment_id UUID,
  p_admin_id   UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.payments%ROWTYPE;
  prof public.profiles%ROWTYPE;
  pkg_tier TEXT;
  permanent_add BIGINT;
  custom_url_add BIGINT;
  premium_add INTEGER;
  is_package BOOLEAN;
  is_plain_topup BOOLEAN;
  is_addon BOOLEAN;
  current_tier_rank INTEGER;
  package_tier_rank INTEGER;
  new_tier TEXT;
  new_expiry TIMESTAMPTZ;
  out_credits NUMERIC;
  out_tier TEXT;
  out_premium INTEGER;
  out_permanent INTEGER;
  out_custom INTEGER;
  out_expiry TIMESTAMPTZ;
BEGIN
  SELECT *
    INTO p
  FROM public.payments
   WHERE id = p_payment_id
     AND status = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % does not exist or is not pending', p_payment_id
    USING ERRCODE = 'P0002';
  END IF;

  IF p.claimed_transfer_time IS NULL OR p.claimed_bank_account_last4 IS NULL THEN
    RAISE EXCEPTION 'Payment % cannot be approved: claimed_transfer_time and claimed_bank_account_last4 are required', p_payment_id;
  END IF;

  UPDATE public.payments SET status = 'approved', approved_at = NOW()
   WHERE id = p_payment_id;

  is_package := p.package_type IS NOT NULL;
  is_plain_topup := p.payment_type = 'topup' AND NOT is_package;
  is_addon := p.payment_type IN ('add_on_custom_url', 'add_on_permanent');

  IF is_plain_topup THEN
    PERFORM public.increment_credits(p.user_id, ROUND(p.amount)::INTEGER);
  END IF;

  IF is_package THEN
    SELECT * INTO prof FROM public.profiles WHERE id = p.user_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Profile % does not exist', p.user_id USING ERRCODE = 'P0002';
    END IF;

    CASE p.package_type
      WHEN 'starter_69' THEN
        pkg_tier := 'starter'; permanent_add := 2; custom_url_add := 2; premium_add := 1;
      WHEN 'value_119' THEN
        pkg_tier := 'value'; permanent_add := 6; custom_url_add := 6; premium_add := 3;
      WHEN 'pro_199' THEN
        pkg_tier := 'pro'; permanent_add := 8; custom_url_add := 8; premium_add := 6;
      WHEN 'god_269' THEN
        pkg_tier := 'god'; permanent_add := 2147483647; custom_url_add := 2147483647; premium_add := 10;
      ELSE
        RAISE EXCEPTION 'Invalid package_type %', p.package_type;
    END CASE;

    current_tier_rank := CASE prof.tier
      WHEN 'starter' THEN 1 WHEN 'value' THEN 2 WHEN 'pro' THEN 3
      WHEN 'god' THEN 4 WHEN 'vip' THEN 5 ELSE 0 END;
    package_tier_rank := CASE pkg_tier
      WHEN 'starter' THEN 1 WHEN 'value' THEN 2 WHEN 'pro' THEN 3
      WHEN 'god' THEN 4 ELSE 0 END;
    new_tier := CASE
      WHEN package_tier_rank > current_tier_rank THEN pkg_tier
      ELSE prof.tier
    END;

    IF prof.package_expires_at IS NOT NULL AND prof.package_expires_at > NOW() THEN
      new_expiry := LEAST(prof.package_expires_at + INTERVAL '30 days', NOW() + INTERVAL '60 days');
    ELSE
      new_expiry := NOW() + INTERVAL '30 days';
    END IF;

    UPDATE public.profiles
       SET tier = new_tier,
           package_tier = pkg_tier,
           package_expires_at = new_expiry,
           quota_expires_at = new_expiry,
           permanent_quota = LEAST(2147483647::BIGINT, prof.permanent_quota::BIGINT + permanent_add::BIGINT)::INTEGER,
           custom_url_quota = LEAST(2147483647::BIGINT, prof.custom_url_quota::BIGINT + custom_url_add::BIGINT)::INTEGER,
           premium_quota = LEAST(2147483647::BIGINT, prof.premium_quota::BIGINT + premium_add::BIGINT)::INTEGER
     WHERE id = p.user_id;
  END IF;

  IF is_addon THEN
    PERFORM public.apply_approved_add_on(p_payment_id);
  END IF;

  INSERT INTO public.admin_action_logs
    (admin_id, action, payment_id, payment_user_id, amount, reason)
  VALUES
    (p_admin_id, 'payment_approved', p.id, p.user_id, p.amount, NULL);

  SELECT credits, tier, premium_quota, permanent_quota, custom_url_quota, quota_expires_at
    INTO out_credits, out_tier, out_premium, out_permanent, out_custom, out_expiry
  FROM public.profiles WHERE id = p.user_id;

  RETURN json_build_object(
    'success', TRUE, 'amount', p.amount, 'payment_type', p.payment_type,
    'package_type', p.package_type, 'credits', out_credits, 'tier', out_tier,
    'premium_quota', out_premium, 'permanent_quota', out_permanent,
    'custom_url_quota', out_custom, 'quota_expires_at', out_expiry
  );
EXCEPTION
  WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payment_transaction(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_payment_transaction(UUID, UUID) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.approve_payment_transaction(UUID, UUID) TO service_role;

-- ============================================================================
-- SECTION 7.2 — process_package_payment (authenticated wallet purchase RPC)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_package_payment(p_package_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  profile_row public.profiles%ROWTYPE;
  package_price NUMERIC;
  package_tier TEXT;
  package_permanent_quota INTEGER;
  package_custom_url_quota INTEGER;
  package_premium_quota INTEGER;
  current_tier_rank INTEGER;
  package_tier_rank INTEGER;
  new_tier TEXT;
  new_expiry TIMESTAMPTZ;
  new_permanent_quota INTEGER;
  new_custom_url_quota INTEGER;
  new_premium_quota INTEGER;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO profile_row
    FROM public.profiles
   WHERE id = caller_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  CASE LOWER(BTRIM(p_package_id))
    WHEN 'starter', 'starter_69', 'package_69', '69' THEN
      package_price := 69;
      package_tier := 'starter';
      package_permanent_quota := 2;
      package_custom_url_quota := 2;
      package_premium_quota := 1;
    WHEN 'value', 'value_119', 'package_119', '119' THEN
      package_price := 119;
      package_tier := 'value';
      package_permanent_quota := 6;
      package_custom_url_quota := 6;
      package_premium_quota := 3;
    WHEN 'pro', 'pro_199', 'package_199', '199' THEN
      package_price := 199;
      package_tier := 'pro';
      package_permanent_quota := 8;
      package_custom_url_quota := 8;
      package_premium_quota := 6;
    WHEN 'god', 'god_269', 'package_269', '269' THEN
      package_price := 269;
      package_tier := 'god';
      package_permanent_quota := 2147483647;
      package_custom_url_quota := 2147483647;
      package_premium_quota := 10;
    ELSE
      RAISE EXCEPTION 'Invalid package';
  END CASE;

  IF profile_row.credits < package_price THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  current_tier_rank := CASE profile_row.tier
    WHEN 'starter' THEN 1 WHEN 'value' THEN 2 WHEN 'pro' THEN 3
    WHEN 'god' THEN 4 WHEN 'vip' THEN 5 ELSE 0 END;
  package_tier_rank := CASE package_tier
    WHEN 'starter' THEN 1 WHEN 'value' THEN 2 WHEN 'pro' THEN 3
    WHEN 'god' THEN 4 ELSE 0 END;
  new_tier := CASE
    WHEN package_tier_rank > current_tier_rank THEN package_tier
    ELSE profile_row.tier
  END;

  IF profile_row.package_expires_at IS NOT NULL AND profile_row.package_expires_at > NOW() THEN
    new_expiry := LEAST(profile_row.package_expires_at + INTERVAL '30 days', NOW() + INTERVAL '60 days');
  ELSE
    new_expiry := NOW() + INTERVAL '30 days';
  END IF;

  new_permanent_quota := LEAST(2147483647::BIGINT, profile_row.permanent_quota::BIGINT + package_permanent_quota::BIGINT)::INTEGER;
  new_custom_url_quota := LEAST(2147483647::BIGINT, profile_row.custom_url_quota::BIGINT + package_custom_url_quota::BIGINT)::INTEGER;
  new_premium_quota := LEAST(2147483647::BIGINT, profile_row.premium_quota::BIGINT + package_premium_quota::BIGINT)::INTEGER;

  UPDATE public.profiles
  SET credits = profile_row.credits - package_price,
      tier = new_tier,
      package_tier = package_tier,
      package_expires_at = new_expiry,
      quota_expires_at = new_expiry,
      permanent_quota = new_permanent_quota,
      custom_url_quota = new_custom_url_quota,
      premium_quota = new_premium_quota
  WHERE id = caller_id
  RETURNING * INTO profile_row;

  RETURN row_to_json(profile_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_package_payment(TEXT) TO authenticated;
-- ============================================================================
-- SECTION 7.3 — purchase_package_atomic (authenticated, idempotent)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.purchase_package_atomic(
  p_package_type TEXT,
  p_idempotency_key TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  profile_row public.profiles%ROWTYPE;
  existing_purchase public.package_purchases%ROWTYPE;
  package_price NUMERIC(12, 2);
  package_tier TEXT;
  permanent_add INTEGER;
  custom_url_add INTEGER;
  premium_add INTEGER;
  current_tier_rank INTEGER;
  package_tier_rank INTEGER;
  new_tier TEXT;
  new_expiry TIMESTAMPTZ;
  new_permanent_quota INTEGER;
  new_custom_url_quota INTEGER;
  new_premium_quota INTEGER;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF COALESCE(BTRIM(p_idempotency_key), '') = '' THEN
    RAISE EXCEPTION 'Idempotency key is required';
  END IF;

  SELECT * INTO profile_row
    FROM public.profiles
   WHERE id = caller_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT * INTO existing_purchase
    FROM public.package_purchases
   WHERE user_id = caller_id
     AND idempotency_key = BTRIM(p_idempotency_key)
   LIMIT 1;

  IF FOUND THEN
    RETURN row_to_json(profile_row);
  END IF;

  CASE LOWER(BTRIM(p_package_type))
    WHEN 'starter', 'starter_69', 'package_69', '69' THEN
      package_price := 69;
      package_tier := 'starter';
      permanent_add := 2;
      custom_url_add := 2;
      premium_add := 1;
    WHEN 'value', 'value_119', 'package_119', '119' THEN
      package_price := 119;
      package_tier := 'value';
      permanent_add := 6;
      custom_url_add := 6;
      premium_add := 3;
    WHEN 'pro', 'pro_199', 'package_199', '199' THEN
      package_price := 199;
      package_tier := 'pro';
      permanent_add := 8;
      custom_url_add := 8;
      premium_add := 6;
    WHEN 'god', 'god_269', 'package_269', '269' THEN
      package_price := 269;
      package_tier := 'god';
      permanent_add := 2147483647;
      custom_url_add := 2147483647;
      premium_add := 10;
    ELSE
      RAISE EXCEPTION 'Invalid package';
  END CASE;

  IF profile_row.credits < package_price THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  current_tier_rank := CASE profile_row.tier
    WHEN 'starter' THEN 1 WHEN 'value' THEN 2 WHEN 'pro' THEN 3
    WHEN 'god' THEN 4 WHEN 'vip' THEN 5 ELSE 0 END;
  package_tier_rank := CASE package_tier
    WHEN 'starter' THEN 1 WHEN 'value' THEN 2 WHEN 'pro' THEN 3
    WHEN 'god' THEN 4 ELSE 0 END;
  new_tier := CASE
    WHEN package_tier_rank > current_tier_rank THEN package_tier
    ELSE profile_row.tier
  END;

  IF profile_row.package_expires_at IS NOT NULL AND profile_row.package_expires_at > NOW() THEN
    new_expiry := LEAST(profile_row.package_expires_at + INTERVAL '30 days', NOW() + INTERVAL '60 days');
  ELSE
    new_expiry := NOW() + INTERVAL '30 days';
  END IF;

  new_permanent_quota := LEAST(2147483647::BIGINT, profile_row.permanent_quota::BIGINT + permanent_add::BIGINT)::INTEGER;
  new_custom_url_quota := LEAST(2147483647::BIGINT, profile_row.custom_url_quota::BIGINT + custom_url_add::BIGINT)::INTEGER;
  new_premium_quota := LEAST(2147483647::BIGINT, profile_row.premium_quota::BIGINT + premium_add::BIGINT)::INTEGER;

  UPDATE public.profiles
  SET credits = profile_row.credits - package_price,
      tier = new_tier,
      package_tier = package_tier,
      package_expires_at = new_expiry,
      quota_expires_at = new_expiry,
      permanent_quota = new_permanent_quota,
      custom_url_quota = new_custom_url_quota,
      premium_quota = new_premium_quota
  WHERE id = caller_id
  RETURNING * INTO profile_row;

  INSERT INTO public.package_purchases (user_id, package_type, amount, idempotency_key)
  VALUES (caller_id, LOWER(BTRIM(p_package_type)), package_price, BTRIM(p_idempotency_key));

  RETURN row_to_json(profile_row);
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO profile_row
      FROM public.profiles
     WHERE id = caller_id;
    RETURN row_to_json(profile_row);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_package_atomic(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_package_atomic(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- SECTION 7.4 — reset_profile_quotas
--   Cumulative model: quotas are PERMANENT and are NEVER reset here (or on
--   expiry). Media-entitlement expiry is evaluated by the app against
--   package_expires_at; nothing is zeroed in the DB.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_profile_quotas(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Not allowed'; END IF;

  UPDATE public.profiles
     SET quota_reset_at = date_trunc('month', NOW())
   WHERE id = p_user_id;
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFY (run after applying; expect 4 rows below, and both checks = t)
-- ============================================================================
SELECT proname
FROM pg_proc
WHERE proname IN ('approve_payment_transaction', 'process_package_payment',
                  'purchase_package_atomic', 'reset_profile_quotas')
ORDER BY proname;

SELECT (prosrc LIKE '%god_269%') AS rpc_accepts_god_269,
       (prosrc LIKE '%60 days%') AS stacking_cap_60d_present
FROM pg_proc
WHERE proname = 'process_package_payment';


-- ============================================================================
-- 20260828000002 — Subscription day-stacking rules (60-day cap) + expiry reset
--
-- Refines the package day calculation introduced in 20260828000001:
--
--   Max Cap Rule    : each purchase adds +30 days to an active window, but the
--                     total window can NEVER exceed NOW() + 60 days:
--                       new_expiry = LEAST(current_expiry + 30d, NOW() + 60d)
--
--   Cumulative      : permanent_quota / custom_url_quota / premium_quota are
--                     PERMANENT ACCUMULATED balances. Purchases ADD (+) their
--                     base quotas; they are never reset or cleared on expiry.
--   Media Entitle   : package_tier + package_expires_at are the ACTIVE package
--                     governing media/priority. When the window lapses or is
--                     NULL the app falls back to free-tier media limits while
--                     every accumulated quota is retained. (Columns + backfill
--                     are added by 20260828000001.)
--
--   Expiry Handling : media entitlement is lazily evaluated (app reads
--                     package_expires_at); quotas are never zeroed on expiry.
--
-- Functions republished here are superseded/corrected by 20260829000001
-- (cumulative + package-aware), which runs later for a fresh `db reset`.
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
--   the application layer against quota_expires_at; nothing is zeroed in the DB.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_profile_quotas(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Not allowed'; END IF;

  -- Cumulative model: permanent/premium/custom_url quotas are PERMANENT and are
  -- NEVER reset here (or on expiry). Media-entitlement expiry is evaluated by
  -- the app layer against package_expires_at. This only marks the interval done.
  UPDATE public.profiles
     SET quota_reset_at = date_trunc('month', NOW())
   WHERE id = p_user_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
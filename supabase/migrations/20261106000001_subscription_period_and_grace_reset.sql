-- ============================================================================
-- 20261106000001 — Fresh 30-day plans + 7-day entitlement grace
--
-- Correct entitlement model:
--   * permanent_quota / custom_url_quota / premium_quota accumulate when a
--     package is purchased. They are cleared after the 7-day grace period.
--   * `package_tier` + `package_expires_at` are the ACTIVE time-boxed package
--     governing media upload limits and priority processing. When the window
--     has lapsed (package_expires_at <= NOW()) or is NULL, media limits fall
--     back to free-tier defaults immediately after expiry.
--   * Every purchase starts a fresh 30-day period. Rights carry through a
--     7-day grace period after expiry; unused rights are then cleared.
--     `package_tier` is set to the newly purchased tier.
--
-- IDEMPOTENT additive delta: safe on a fresh `supabase db reset` and on the
-- hosted project. Re-publishes approve_payment_transaction /
-- process_package_payment / purchase_package_atomic (cumulative + package-aware)
-- and adds expiry cleanup while preserving timely renewals.
-- ============================================================================

-- ============================================================================
-- SCHEMA — active package entitlement columns + backfill
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS package_tier TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS package_expires_at TIMESTAMPTZ;

UPDATE public.profiles
   SET package_tier = CASE WHEN tier IN ('starter', 'value', 'pro', 'god')
                           THEN tier ELSE package_tier END,
       package_expires_at = CASE WHEN quota_expires_at IS NOT NULL
                                 THEN quota_expires_at ELSE package_expires_at END
 WHERE package_tier IS NULL OR package_expires_at IS NULL;
-- ============================================================================
-- SECTION 1 — approve_payment_transaction (admin approval; service_role only)
--   Single-flight (FOR UPDATE on the pending row) so an approved payment is
--   idempotent. Quotas accumulate; package_tier/package_expires_at are set.
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
    new_tier := CASE WHEN prof.tier = 'vip' THEN 'vip' ELSE pkg_tier END;
    new_expiry := p.claimed_transfer_time + INTERVAL '30 days';

    UPDATE public.profiles
       SET tier = new_tier,
           package_tier = pkg_tier,
           package_expires_at = new_expiry,
           quota_expires_at = new_expiry,
           permanent_quota = LEAST(2147483647::BIGINT, (CASE WHEN prof.package_expires_at IS NULL OR p.claimed_transfer_time > prof.package_expires_at + INTERVAL '7 days' THEN 0 ELSE prof.permanent_quota END)::BIGINT + permanent_add::BIGINT)::INTEGER,
           custom_url_quota = LEAST(2147483647::BIGINT, (CASE WHEN prof.package_expires_at IS NULL OR p.claimed_transfer_time > prof.package_expires_at + INTERVAL '7 days' THEN 0 ELSE prof.custom_url_quota END)::BIGINT + custom_url_add::BIGINT)::INTEGER,
           premium_quota = LEAST(2147483647::BIGINT, (CASE WHEN prof.package_expires_at IS NULL OR p.claimed_transfer_time > prof.package_expires_at + INTERVAL '7 days' THEN 0 ELSE prof.premium_quota END)::BIGINT + premium_add::BIGINT)::INTEGER
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
-- SECTION 2 — process_package_payment (authenticated wallet purchase RPC)
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
  v_package_tier TEXT;
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
      v_package_tier := 'starter';
      package_permanent_quota := 2;
      package_custom_url_quota := 2;
      package_premium_quota := 1;
    WHEN 'value', 'value_119', 'package_119', '119' THEN
      package_price := 119;
      v_package_tier := 'value';
      package_permanent_quota := 6;
      package_custom_url_quota := 6;
      package_premium_quota := 3;
    WHEN 'pro', 'pro_199', 'package_199', '199' THEN
      package_price := 199;
      v_package_tier := 'pro';
      package_permanent_quota := 8;
      package_custom_url_quota := 8;
      package_premium_quota := 6;
    WHEN 'god', 'god_269', 'package_269', '269' THEN
      package_price := 269;
      v_package_tier := 'god';
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
  package_tier_rank := CASE v_package_tier
    WHEN 'starter' THEN 1 WHEN 'value' THEN 2 WHEN 'pro' THEN 3
    WHEN 'god' THEN 4 ELSE 0 END;
  new_tier := CASE WHEN profile_row.tier = 'vip' THEN 'vip' ELSE v_package_tier END;
  new_expiry := NOW() + INTERVAL '30 days';

  new_permanent_quota := LEAST(2147483647::BIGINT, (CASE WHEN profile_row.package_expires_at IS NULL OR profile_row.package_expires_at < NOW() - INTERVAL '7 days' THEN 0 ELSE profile_row.permanent_quota END)::BIGINT + package_permanent_quota::BIGINT)::INTEGER;
  new_custom_url_quota := LEAST(2147483647::BIGINT, (CASE WHEN profile_row.package_expires_at IS NULL OR profile_row.package_expires_at < NOW() - INTERVAL '7 days' THEN 0 ELSE profile_row.custom_url_quota END)::BIGINT + package_custom_url_quota::BIGINT)::INTEGER;
  new_premium_quota := LEAST(2147483647::BIGINT, (CASE WHEN profile_row.package_expires_at IS NULL OR profile_row.package_expires_at < NOW() - INTERVAL '7 days' THEN 0 ELSE profile_row.premium_quota END)::BIGINT + package_premium_quota::BIGINT)::INTEGER;

  UPDATE public.profiles
  SET credits = profile_row.credits - package_price,
      tier = new_tier,
      package_tier = v_package_tier,
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
-- SECTION 3 — purchase_package_atomic (authenticated, idempotent)
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
  v_package_tier TEXT;
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
      v_package_tier := 'starter';
      permanent_add := 2;
      custom_url_add := 2;
      premium_add := 1;
    WHEN 'value', 'value_119', 'package_119', '119' THEN
      package_price := 119;
      v_package_tier := 'value';
      permanent_add := 6;
      custom_url_add := 6;
      premium_add := 3;
    WHEN 'pro', 'pro_199', 'package_199', '199' THEN
      package_price := 199;
      v_package_tier := 'pro';
      permanent_add := 8;
      custom_url_add := 8;
      premium_add := 6;
    WHEN 'god', 'god_269', 'package_269', '269' THEN
      package_price := 269;
      v_package_tier := 'god';
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
  package_tier_rank := CASE v_package_tier
    WHEN 'starter' THEN 1 WHEN 'value' THEN 2 WHEN 'pro' THEN 3
    WHEN 'god' THEN 4 ELSE 0 END;
  new_tier := CASE WHEN profile_row.tier = 'vip' THEN 'vip' ELSE v_package_tier END;
  new_expiry := NOW() + INTERVAL '30 days';

  new_permanent_quota := LEAST(2147483647::BIGINT, (CASE WHEN profile_row.package_expires_at IS NULL OR profile_row.package_expires_at < NOW() - INTERVAL '7 days' THEN 0 ELSE profile_row.permanent_quota END)::BIGINT + permanent_add::BIGINT)::INTEGER;
  new_custom_url_quota := LEAST(2147483647::BIGINT, (CASE WHEN profile_row.package_expires_at IS NULL OR profile_row.package_expires_at < NOW() - INTERVAL '7 days' THEN 0 ELSE profile_row.custom_url_quota END)::BIGINT + custom_url_add::BIGINT)::INTEGER;
  new_premium_quota := LEAST(2147483647::BIGINT, (CASE WHEN profile_row.package_expires_at IS NULL OR profile_row.package_expires_at < NOW() - INTERVAL '7 days' THEN 0 ELSE profile_row.premium_quota END)::BIGINT + premium_add::BIGINT)::INTEGER;

  UPDATE public.profiles
  SET credits = profile_row.credits - package_price,
      tier = new_tier,
      package_tier = v_package_tier,
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

-- Expire package balances lazily when the user returns after the 7-day grace.
-- A payment transferred within the grace period keeps balances pending review.
CREATE OR REPLACE FUNCTION public.expire_my_package_entitlements()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  -- Package access itself ends on the expiry date; the grace period only
  -- protects unused balances while the customer decides whether to renew.
  UPDATE public.profiles
     SET tier = 'free'
   WHERE id = caller_id
     AND tier <> 'vip'
     AND package_tier IS NOT NULL
     AND package_expires_at <= NOW();

  UPDATE public.profiles prof
     SET tier = CASE WHEN prof.tier = 'vip' THEN 'vip' ELSE 'free' END,
         package_tier = NULL,
         package_expires_at = NULL,
         quota_expires_at = NULL,
         permanent_quota = 0,
         custom_url_quota = 0,
         premium_quota = 0
   WHERE prof.id = caller_id
     AND prof.package_tier IS NOT NULL
     AND prof.package_expires_at < NOW() - INTERVAL '7 days'
     AND NOT EXISTS (
       SELECT 1 FROM public.payments p
        WHERE p.user_id = prof.id
          AND p.status = 'pending'
          AND p.package_type IS NOT NULL
          AND p.claimed_transfer_time <= prof.package_expires_at + INTERVAL '7 days'
     );
END;
$$;

REVOKE ALL ON FUNCTION public.expire_my_package_entitlements() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_my_package_entitlements() TO authenticated;

-- Also clear stale balances in the background, even when an account is idle.
CREATE OR REPLACE FUNCTION public.expire_lapsed_package_entitlements()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles prof
     SET tier = CASE WHEN prof.tier = 'vip' THEN 'vip' ELSE 'free' END,
         package_tier = NULL,
         package_expires_at = NULL,
         quota_expires_at = NULL,
         permanent_quota = 0,
         custom_url_quota = 0,
         premium_quota = 0
   WHERE prof.package_tier IS NOT NULL
     AND prof.package_expires_at < NOW() - INTERVAL '7 days'
     AND NOT EXISTS (
       SELECT 1 FROM public.payments p
        WHERE p.user_id = prof.id
          AND p.status = 'pending'
          AND p.package_type IS NOT NULL
          AND p.claimed_transfer_time <= prof.package_expires_at + INTERVAL '7 days'
     );
END;
$$;

REVOKE ALL ON FUNCTION public.expire_lapsed_package_entitlements() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.unschedule(jobid)
  FROM cron.job
 WHERE jobname = 'expire-lapsed-package-entitlements';
SELECT cron.schedule(
  'expire-lapsed-package-entitlements',
  '*/15 * * * *',
  'SELECT public.expire_lapsed_package_entitlements();'
);

-- ============================================================================
-- SECTION 4 — reset_profile_quotas
-- Monthly reset bookkeeping remains separate from subscription expiry. The
-- expiry function above handles unused package balances after the grace period.
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

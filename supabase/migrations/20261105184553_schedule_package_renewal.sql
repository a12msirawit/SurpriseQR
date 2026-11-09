-- Prepay one renewal of the active plan without interrupting its current cycle.

-- Store one prepaid renewal on the profile and leave the active cycle intact.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scheduled_package_tier TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_package_effective_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  effective_role TEXT := current_setting('role', true);
  session_role TEXT := session_user;
BEGIN
  IF effective_role NOT IN ('postgres', 'service_role', 'supabase_admin')
     AND session_role NOT IN ('postgres', 'service_role', 'supabase_admin')
     AND (
       NEW.credits IS DISTINCT FROM OLD.credits
       OR NEW.tier IS DISTINCT FROM OLD.tier
       OR NEW.permanent_quota IS DISTINCT FROM OLD.permanent_quota
       OR NEW.custom_url_quota IS DISTINCT FROM OLD.custom_url_quota
       OR NEW.premium_quota IS DISTINCT FROM OLD.premium_quota
       OR NEW.quota_expires_at IS DISTINCT FROM OLD.quota_expires_at
       OR NEW.package_tier IS DISTINCT FROM OLD.package_tier
       OR NEW.package_expires_at IS DISTINCT FROM OLD.package_expires_at
       OR NEW.scheduled_package_tier IS DISTINCT FROM OLD.scheduled_package_tier
       OR NEW.scheduled_package_effective_at IS DISTINCT FROM OLD.scheduled_package_effective_at
     ) THEN
    RAISE EXCEPTION 'Cannot modify protected profile fields directly';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_package_purchase(
  p_user_id UUID,
  p_package_type TEXT,
  p_charge_wallet BOOLEAN,
  p_purchased_at TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof public.profiles%ROWTYPE;
  v_package_tier TEXT;
  v_package_price NUMERIC;
  v_permanent_add INTEGER;
  v_custom_add INTEGER;
  v_premium_add INTEGER;
  v_expiry TIMESTAMPTZ;
  v_keep_rights BOOLEAN;
BEGIN
  IF p_charge_wallet AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  CASE LOWER(BTRIM(p_package_type))
    WHEN 'starter', 'starter_69', 'package_69', '69' THEN
      v_package_tier := 'starter'; v_package_price := 69; v_permanent_add := 2; v_custom_add := 2; v_premium_add := 1;
    WHEN 'value', 'value_119', 'package_119', '119' THEN
      v_package_tier := 'value'; v_package_price := 119; v_permanent_add := 6; v_custom_add := 6; v_premium_add := 3;
    WHEN 'pro', 'pro_199', 'package_199', '199' THEN
      v_package_tier := 'pro'; v_package_price := 199; v_permanent_add := 8; v_custom_add := 8; v_premium_add := 6;
    WHEN 'god', 'god_269', 'package_269', '269' THEN
      v_package_tier := 'god'; v_package_price := 269; v_permanent_add := 2147483647; v_custom_add := 2147483647; v_premium_add := 10;
    ELSE RAISE EXCEPTION 'Invalid package';
  END CASE;

  IF p_charge_wallet AND EXISTS (
    SELECT 1 FROM public.payments p
     WHERE p.user_id = p_user_id AND p.status = 'pending' AND p.package_type IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'A package payment is already pending review';
  END IF;
  IF prof.scheduled_package_tier IS NOT NULL THEN
    RAISE EXCEPTION 'A package renewal is already scheduled';
  END IF;
  IF p_charge_wallet AND prof.credits < v_package_price THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Same active plan means early renewal: charge once and queue one future
  -- period. Do not change the current plan or grant the next period's quotas yet.
  IF prof.package_tier = v_package_tier
     AND prof.package_expires_at IS NOT NULL
     AND prof.package_expires_at > NOW() THEN
    UPDATE public.profiles
       SET credits = CASE WHEN p_charge_wallet THEN prof.credits - v_package_price ELSE prof.credits END,
           scheduled_package_tier = v_package_tier,
           scheduled_package_effective_at = prof.package_expires_at
     WHERE id = p_user_id
     RETURNING * INTO prof;
    RETURN row_to_json(prof);
  END IF;

  v_expiry := COALESCE(p_purchased_at, NOW()) + INTERVAL '30 days';
  v_keep_rights := prof.package_expires_at IS NOT NULL AND
    COALESCE(p_purchased_at, NOW()) <= prof.package_expires_at + INTERVAL '7 days';

  UPDATE public.profiles
     SET credits = CASE WHEN p_charge_wallet THEN prof.credits - v_package_price ELSE prof.credits END,
         tier = CASE WHEN prof.tier = 'vip' THEN 'vip' ELSE v_package_tier END,
         package_tier = v_package_tier,
         package_expires_at = v_expiry,
         quota_expires_at = v_expiry,
         permanent_quota = LEAST(2147483647::BIGINT, (CASE WHEN v_keep_rights THEN prof.permanent_quota ELSE 0 END)::BIGINT + v_permanent_add::BIGINT)::INTEGER,
         custom_url_quota = LEAST(2147483647::BIGINT, (CASE WHEN v_keep_rights THEN prof.custom_url_quota ELSE 0 END)::BIGINT + v_custom_add::BIGINT)::INTEGER,
         premium_quota = LEAST(2147483647::BIGINT, (CASE WHEN v_keep_rights THEN prof.premium_quota ELSE 0 END)::BIGINT + v_premium_add::BIGINT)::INTEGER
   WHERE id = p_user_id
   RETURNING * INTO prof;

  RETURN row_to_json(prof);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_package_purchase(UUID, TEXT, BOOLEAN, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;


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
    PERFORM public.apply_package_purchase(p.user_id, p.package_type, FALSE, p.claimed_transfer_time);
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
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN public.apply_package_purchase(caller_id, p_package_id, TRUE, NOW());
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_package_payment(TEXT) TO authenticated;
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
  prof public.profiles%ROWTYPE;
  existing_purchase public.package_purchases%ROWTYPE;
  package_price NUMERIC(12, 2);
  result_profile JSON;
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF COALESCE(BTRIM(p_idempotency_key), '') = '' THEN RAISE EXCEPTION 'Idempotency key is required'; END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = caller_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  SELECT * INTO existing_purchase FROM public.package_purchases
   WHERE user_id = caller_id AND idempotency_key = BTRIM(p_idempotency_key) LIMIT 1;
  IF FOUND THEN RETURN row_to_json(prof); END IF;

  CASE LOWER(BTRIM(p_package_type))
    WHEN 'starter', 'starter_69', 'package_69', '69' THEN package_price := 69;
    WHEN 'value', 'value_119', 'package_119', '119' THEN package_price := 119;
    WHEN 'pro', 'pro_199', 'package_199', '199' THEN package_price := 199;
    WHEN 'god', 'god_269', 'package_269', '269' THEN package_price := 269;
    ELSE RAISE EXCEPTION 'Invalid package';
  END CASE;

  result_profile := public.apply_package_purchase(caller_id, p_package_type, TRUE, NOW());
  INSERT INTO public.package_purchases (user_id, package_type, amount, idempotency_key)
  VALUES (caller_id, LOWER(BTRIM(p_package_type)), package_price, BTRIM(p_idempotency_key));
  RETURN result_profile;
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO prof FROM public.profiles WHERE id = caller_id;
  RETURN row_to_json(prof);
END;
$$;
REVOKE ALL ON FUNCTION public.purchase_package_atomic(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_package_atomic(TEXT, TEXT) TO authenticated;
CREATE OR REPLACE FUNCTION public.activate_scheduled_package_renewals(p_user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles prof
     SET tier = CASE WHEN prof.tier = 'vip' THEN 'vip' ELSE prof.scheduled_package_tier END,
         package_tier = prof.scheduled_package_tier,
         package_expires_at = prof.scheduled_package_effective_at + INTERVAL '30 days',
         quota_expires_at = prof.scheduled_package_effective_at + INTERVAL '30 days',
         permanent_quota = LEAST(2147483647::BIGINT, prof.permanent_quota::BIGINT +
           CASE prof.scheduled_package_tier WHEN 'starter' THEN 2 WHEN 'value' THEN 6 WHEN 'pro' THEN 8 ELSE 2147483647 END)::INTEGER,
         custom_url_quota = LEAST(2147483647::BIGINT, prof.custom_url_quota::BIGINT +
           CASE prof.scheduled_package_tier WHEN 'starter' THEN 2 WHEN 'value' THEN 6 WHEN 'pro' THEN 8 ELSE 2147483647 END)::INTEGER,
         premium_quota = LEAST(2147483647::BIGINT, prof.premium_quota::BIGINT +
           CASE prof.scheduled_package_tier WHEN 'starter' THEN 1 WHEN 'value' THEN 3 WHEN 'pro' THEN 6 ELSE 10 END)::INTEGER,
         scheduled_package_tier = NULL,
         scheduled_package_effective_at = NULL
   WHERE prof.scheduled_package_tier IS NOT NULL
     AND prof.scheduled_package_effective_at <= NOW()
     AND (p_user_id IS NULL OR prof.id = p_user_id);
END;
$$;
REVOKE ALL ON FUNCTION public.activate_scheduled_package_renewals(UUID) FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'activate-scheduled-package-renewals';
SELECT cron.schedule('activate-scheduled-package-renewals', '* * * * *', 'SELECT public.activate_scheduled_package_renewals();');
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

  PERFORM public.activate_scheduled_package_renewals(caller_id);

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



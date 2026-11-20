-- Update package prices only:
-- Starter Pack: 99, Value Pack: 199, Pro Pack: 269, God Pack: 399
-- Canonical package_type identifiers (starter_69, value_119, pro_199, god_269)
-- and all quotas/features remain unchanged.

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
    WHEN 'starter', 'starter_69', 'package_69', '69', '99', 'package_99' THEN
      package_price := 99;
      v_package_tier := 'starter';
      package_permanent_quota := 2;
      package_custom_url_quota := 2;
      package_premium_quota := 1;
    WHEN 'value', 'value_119', 'package_119', '119', 'package_199' THEN
      package_price := 199;
      v_package_tier := 'value';
      package_permanent_quota := 6;
      package_custom_url_quota := 6;
      package_premium_quota := 3;
    WHEN 'pro', 'pro_199', 'package_269' THEN
      package_price := 269;
      v_package_tier := 'pro';
      package_permanent_quota := 8;
      package_custom_url_quota := 8;
      package_premium_quota := 6;
    WHEN 'god', 'god_269', '399', 'package_399' THEN
      package_price := 399;
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
    WHEN 'starter', 'starter_69', 'package_69', '69', '99', 'package_99' THEN
      package_price := 99;
      v_package_tier := 'starter';
      permanent_add := 2;
      custom_url_add := 2;
      premium_add := 1;
    WHEN 'value', 'value_119', 'package_119', '119', 'package_199' THEN
      package_price := 199;
      v_package_tier := 'value';
      permanent_add := 6;
      custom_url_add := 6;
      premium_add := 3;
    WHEN 'pro', 'pro_199', 'package_269' THEN
      package_price := 269;
      v_package_tier := 'pro';
      permanent_add := 8;
      custom_url_add := 8;
      premium_add := 6;
    WHEN 'god', 'god_269', '399', 'package_399' THEN
      package_price := 399;
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

CREATE OR REPLACE FUNCTION public.submit_package_payment(
  p_package_type TEXT,
  p_amount NUMERIC,
  p_slip_url TEXT,
  p_claimed_transfer_time TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  prof public.profiles%ROWTYPE;
  v_tier TEXT;
  v_price NUMERIC;
  v_due NUMERIC;
  v_credit_to_apply NUMERIC;
  v_package_refund_credit NUMERIC := 0;
  v_pending_credit_applied NUMERIC := 0;
  v_scheduled_credit NUMERIC := 0;
  v_active BOOLEAN;
  v_current_rank INTEGER;
  v_new_rank INTEGER;
  v_payment public.payments%ROWTYPE;
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_slip_url IS NULL OR BTRIM(p_slip_url) = '' THEN RAISE EXCEPTION 'Slip is required'; END IF;
  IF p_claimed_transfer_time IS NULL OR p_claimed_transfer_time > NOW() + INTERVAL '5 minutes' THEN RAISE EXCEPTION 'Invalid transfer time'; END IF;

  CASE LOWER(BTRIM(p_package_type))
    WHEN 'starter', 'starter_69' THEN v_tier := 'starter'; v_price := 99;
    WHEN 'value', 'value_119' THEN v_tier := 'value'; v_price := 199;
    WHEN 'pro', 'pro_199' THEN v_tier := 'pro'; v_price := 269;
    WHEN 'god', 'god_269' THEN v_tier := 'god'; v_price := 399;
    ELSE RAISE EXCEPTION 'Invalid package';
  END CASE;

  PERFORM public.activate_scheduled_package_renewals(caller_id);
  SELECT * INTO prof FROM public.profiles WHERE id = caller_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  v_active := prof.package_tier IS NOT NULL AND prof.package_expires_at > NOW();
  v_current_rank := CASE WHEN v_active THEN public.package_tier_rank(prof.package_tier) ELSE 0 END;
  v_new_rank := public.package_tier_rank(v_tier);
  IF v_active AND v_new_rank < v_current_rank THEN RAISE EXCEPTION 'Cannot downgrade until current package expires'; END IF;
  IF v_active AND v_new_rank = v_current_rank AND prof.package_expires_at > NOW() + INTERVAL '7 days' THEN
    RAISE EXCEPTION 'Renewal is available only during the last 7 days';
  END IF;
  IF v_active AND v_new_rank = v_current_rank AND prof.scheduled_package_tier = v_tier THEN
    RAISE EXCEPTION 'A package renewal is already scheduled';
  END IF;

  SELECT COALESCE(SUM(p.package_credit_applied), 0)
    INTO v_pending_credit_applied
    FROM public.payments p
   WHERE p.user_id = caller_id AND p.status = 'pending' AND p.package_type IS NOT NULL;
  IF v_pending_credit_applied > 0 OR EXISTS (
    SELECT 1 FROM public.payments p WHERE p.user_id = caller_id AND p.status = 'pending' AND p.package_type IS NOT NULL
  ) THEN
    IF v_active AND v_new_rank = v_current_rank THEN RAISE EXCEPTION 'A package payment is already pending review'; END IF;
    UPDATE public.payments
       SET status = 'rejected', reject_reason = 'Cancelled by user when selecting another package'
     WHERE user_id = caller_id AND status = 'pending' AND package_type IS NOT NULL;
  END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = caller_id;
  IF prof.scheduled_package_tier IS NOT NULL THEN
    IF v_new_rank <= v_current_rank THEN RAISE EXCEPTION 'A package renewal is already scheduled'; END IF;
    v_scheduled_credit := CASE WHEN prof.scheduled_package_paid_amount > 0 THEN prof.scheduled_package_paid_amount
      ELSE CASE prof.scheduled_package_tier WHEN 'starter' THEN 99 WHEN 'value' THEN 199 WHEN 'pro' THEN 269 WHEN 'god' THEN 399 ELSE 0 END END;
    UPDATE public.profiles
       SET credits = credits + v_scheduled_credit,
           scheduled_package_tier = NULL,
           scheduled_package_effective_at = NULL,
           scheduled_package_paid_amount = 0
     WHERE id = caller_id
     RETURNING * INTO prof;
  END IF;

  v_package_refund_credit := v_scheduled_credit + v_pending_credit_applied;
  v_credit_to_apply := LEAST(v_price, v_package_refund_credit);
  v_due := v_price - v_credit_to_apply;
  IF v_due <= 0 THEN RAISE EXCEPTION 'Wallet credits cover the package; use wallet payment'; END IF;
  IF ROUND(COALESCE(p_amount, 0), 2) <> v_due THEN RAISE EXCEPTION 'Package amount changed; refresh the page and try again'; END IF;
  IF prof.credits < v_credit_to_apply THEN RAISE EXCEPTION 'Package credit refund is unavailable'; END IF;

  UPDATE public.profiles SET credits = credits - v_credit_to_apply WHERE id = caller_id;
  INSERT INTO public.payments (
    user_id, slip_url, amount, credits_granted, status, payment_type, package_type,
    claimed_transfer_time, package_credit_applied
  ) VALUES (
    caller_id, p_slip_url, v_due, 0, 'pending', 'topup',
    CASE v_tier WHEN 'starter' THEN 'starter_69' WHEN 'value' THEN 'value_119' WHEN 'pro' THEN 'pro_199' ELSE 'god_269' END,
    p_claimed_transfer_time, v_credit_to_apply
  ) RETURNING * INTO v_payment;

  RETURN json_build_object('id', v_payment.id, 'status', v_payment.status, 'amount', v_payment.amount);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_package_payment(TEXT, NUMERIC, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_package_payment(TEXT, NUMERIC, TEXT, TIMESTAMPTZ) TO authenticated;

NOTIFY pgrst, 'reload schema';


-- PromptPay should charge the package price less only prepaid package value
-- being refunded by the current upgrade. Ordinary wallet credits stay in the
-- wallet and are used by the separate wallet-payment option.

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
    WHEN 'starter', 'starter_69' THEN v_tier := 'starter'; v_price := 69;
    WHEN 'value', 'value_119' THEN v_tier := 'value'; v_price := 119;
    WHEN 'pro', 'pro_199' THEN v_tier := 'pro'; v_price := 199;
    WHEN 'god', 'god_269' THEN v_tier := 'god'; v_price := 269;
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
      ELSE CASE prof.scheduled_package_tier WHEN 'starter' THEN 69 WHEN 'value' THEN 119 WHEN 'pro' THEN 199 WHEN 'god' THEN 269 ELSE 0 END END;
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

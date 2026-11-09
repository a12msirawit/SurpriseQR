-- Enforce package hierarchy, open same-plan renewals only during the last
-- seven days, and return prepaid package value as wallet credit on upgrade.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scheduled_package_paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

UPDATE public.profiles
   SET scheduled_package_paid_amount = CASE scheduled_package_tier
     WHEN 'starter' THEN 69 WHEN 'value' THEN 119 WHEN 'pro' THEN 199 WHEN 'god' THEN 269 ELSE 0 END
 WHERE scheduled_package_tier IS NOT NULL
   AND scheduled_package_paid_amount = 0;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS package_credit_applied NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reject_reason TEXT;

CREATE OR REPLACE FUNCTION public.package_tier_rank(p_tier TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE LOWER(BTRIM(COALESCE(p_tier, '')))
    WHEN 'starter' THEN 1 WHEN 'starter_69' THEN 1 WHEN '69' THEN 1
    WHEN 'value' THEN 2 WHEN 'value_119' THEN 2 WHEN '119' THEN 2
    WHEN 'pro' THEN 3 WHEN 'pro_199' THEN 3 WHEN '199' THEN 3
    WHEN 'god' THEN 4 WHEN 'god_269' THEN 4 WHEN '269' THEN 4
    ELSE 0 END;
$$;
REVOKE ALL ON FUNCTION public.package_tier_rank(TEXT) FROM PUBLIC, anon, authenticated;

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
       OR NEW.scheduled_package_paid_amount IS DISTINCT FROM OLD.scheduled_package_paid_amount
     ) THEN
    RAISE EXCEPTION 'Cannot modify protected profile fields directly';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_package_credit_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'rejected' AND OLD.package_credit_applied > 0 THEN
    UPDATE public.profiles
       SET credits = credits + OLD.package_credit_applied
     WHERE id = OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.restore_package_credit_reservation() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS restore_package_credit_reservation ON public.payments;
CREATE TRIGGER restore_package_credit_reservation
AFTER UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.restore_package_credit_reservation();

CREATE UNIQUE INDEX IF NOT EXISTS payments_one_pending_package_per_user
  ON public.payments(user_id)
  WHERE status = 'pending' AND package_type IS NOT NULL;

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
         scheduled_package_effective_at = NULL,
         scheduled_package_paid_amount = 0
   WHERE prof.scheduled_package_tier IS NOT NULL
     AND prof.scheduled_package_effective_at <= NOW()
     AND (p_user_id IS NULL OR prof.id = p_user_id);
END;
$$;
REVOKE ALL ON FUNCTION public.activate_scheduled_package_renewals(UUID) FROM PUBLIC, anon, authenticated;

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
  v_active BOOLEAN;
  v_current_rank INTEGER;
  v_new_rank INTEGER;
BEGIN
  IF p_charge_wallet AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM public.activate_scheduled_package_renewals(p_user_id);
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

  v_active := prof.package_tier IS NOT NULL AND prof.package_expires_at > NOW();
  v_current_rank := CASE WHEN v_active THEN public.package_tier_rank(prof.package_tier) ELSE 0 END;
  v_new_rank := public.package_tier_rank(v_package_tier);

  IF v_active AND v_new_rank < v_current_rank THEN
    RAISE EXCEPTION 'Cannot downgrade until current package expires';
  END IF;
  IF v_active AND v_new_rank = v_current_rank
     AND prof.package_expires_at > NOW() + INTERVAL '7 days' THEN
    RAISE EXCEPTION 'Renewal is available only during the last 7 days';
  END IF;

  IF p_charge_wallet THEN
    IF v_active AND v_new_rank = v_current_rank AND EXISTS (
      SELECT 1 FROM public.payments p WHERE p.user_id = p_user_id AND p.status = 'pending' AND p.package_type IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'A package payment is already pending review';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.payments p WHERE p.user_id = p_user_id AND p.status = 'pending' AND p.package_type IS NOT NULL
    ) THEN
      UPDATE public.payments
         SET status = 'rejected', reject_reason = 'Cancelled by user when selecting another package'
       WHERE user_id = p_user_id AND status = 'pending' AND package_type IS NOT NULL;
      SELECT * INTO prof FROM public.profiles WHERE id = p_user_id;
    END IF;
  END IF;

  IF prof.scheduled_package_tier IS NOT NULL THEN
    IF v_new_rank <= v_current_rank THEN
      RAISE EXCEPTION 'A package renewal is already scheduled';
    END IF;
    UPDATE public.profiles
       SET credits = credits + CASE WHEN scheduled_package_paid_amount > 0 THEN scheduled_package_paid_amount
         ELSE CASE scheduled_package_tier WHEN 'starter' THEN 69 WHEN 'value' THEN 119 WHEN 'pro' THEN 199 WHEN 'god' THEN 269 ELSE 0 END END,
           scheduled_package_tier = NULL,
           scheduled_package_effective_at = NULL,
           scheduled_package_paid_amount = 0
     WHERE id = p_user_id
     RETURNING * INTO prof;
  END IF;

  IF p_charge_wallet AND prof.credits < v_package_price THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  v_expiry := COALESCE(p_purchased_at, NOW()) + INTERVAL '30 days';
  v_keep_rights := prof.package_expires_at IS NOT NULL AND
    COALESCE(p_purchased_at, NOW()) <= prof.package_expires_at + INTERVAL '7 days';

  IF v_active AND v_new_rank = v_current_rank THEN
    UPDATE public.profiles
       SET credits = CASE WHEN p_charge_wallet THEN credits - v_package_price ELSE credits END,
           scheduled_package_tier = v_package_tier,
           scheduled_package_effective_at = prof.package_expires_at,
           scheduled_package_paid_amount = v_package_price
     WHERE id = p_user_id
     RETURNING * INTO prof;
    RETURN row_to_json(prof);
  END IF;

  UPDATE public.profiles
     SET credits = CASE WHEN p_charge_wallet THEN credits - v_package_price ELSE credits END,
         tier = CASE WHEN prof.tier = 'vip' THEN 'vip' ELSE v_package_tier END,
         package_tier = v_package_tier,
         package_expires_at = v_expiry,
         quota_expires_at = v_expiry,
         permanent_quota = LEAST(2147483647::BIGINT, (CASE WHEN v_keep_rights THEN permanent_quota ELSE 0 END)::BIGINT + v_permanent_add::BIGINT)::INTEGER,
         custom_url_quota = LEAST(2147483647::BIGINT, (CASE WHEN v_keep_rights THEN custom_url_quota ELSE 0 END)::BIGINT + v_custom_add::BIGINT)::INTEGER,
         premium_quota = LEAST(2147483647::BIGINT, (CASE WHEN v_keep_rights THEN premium_quota ELSE 0 END)::BIGINT + v_premium_add::BIGINT)::INTEGER,
         scheduled_package_tier = NULL,
         scheduled_package_effective_at = NULL,
         scheduled_package_paid_amount = 0
   WHERE id = p_user_id
   RETURNING * INTO prof;

  RETURN row_to_json(prof);
END;
$$;
REVOKE ALL ON FUNCTION public.apply_package_purchase(UUID, TEXT, BOOLEAN, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_package_payment(
  p_package_type TEXT,
  p_amount NUMERIC,
  p_slip_url TEXT,
  p_claimed_transfer_time TIMESTAMPTZ,
  p_claimed_bank_account_last4 TEXT
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
  v_active BOOLEAN;
  v_current_rank INTEGER;
  v_new_rank INTEGER;
  v_payment public.payments%ROWTYPE;
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_slip_url IS NULL OR BTRIM(p_slip_url) = '' THEN RAISE EXCEPTION 'Slip is required'; END IF;
  IF p_claimed_transfer_time IS NULL OR p_claimed_transfer_time > NOW() + INTERVAL '5 minutes' THEN RAISE EXCEPTION 'Invalid transfer time'; END IF;
  IF COALESCE(p_claimed_bank_account_last4, '') !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'Invalid bank account last4'; END IF;

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

  IF EXISTS (SELECT 1 FROM public.payments p WHERE p.user_id = caller_id AND p.status = 'pending' AND p.package_type IS NOT NULL) THEN
    IF v_active AND v_new_rank = v_current_rank THEN RAISE EXCEPTION 'A package payment is already pending review'; END IF;
    UPDATE public.payments
       SET status = 'rejected', reject_reason = 'Cancelled by user when selecting another package'
     WHERE user_id = caller_id AND status = 'pending' AND package_type IS NOT NULL;
  END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = caller_id;
  IF prof.scheduled_package_tier IS NOT NULL THEN
    IF v_new_rank <= v_current_rank THEN RAISE EXCEPTION 'A package renewal is already scheduled'; END IF;
    UPDATE public.profiles
       SET credits = credits + CASE WHEN scheduled_package_paid_amount > 0 THEN scheduled_package_paid_amount
         ELSE CASE scheduled_package_tier WHEN 'starter' THEN 69 WHEN 'value' THEN 119 WHEN 'pro' THEN 199 WHEN 'god' THEN 269 ELSE 0 END END,
           scheduled_package_tier = NULL,
           scheduled_package_effective_at = NULL,
           scheduled_package_paid_amount = 0
     WHERE id = caller_id
     RETURNING * INTO prof;
  END IF;

  v_credit_to_apply := LEAST(v_price, GREATEST(0, prof.credits));
  v_due := v_price - v_credit_to_apply;
  IF v_due <= 0 THEN RAISE EXCEPTION 'Wallet credits cover the package; use wallet payment'; END IF;
  IF ROUND(COALESCE(p_amount, 0), 2) <> v_due THEN RAISE EXCEPTION 'Package amount changed; refresh the page and try again'; END IF;

  UPDATE public.profiles SET credits = credits - v_credit_to_apply WHERE id = caller_id;
  INSERT INTO public.payments (
    user_id, slip_url, amount, credits_granted, status, payment_type, package_type,
    claimed_transfer_time, claimed_bank_account_last4, package_credit_applied
  ) VALUES (
    caller_id, p_slip_url, v_due, 0, 'pending', 'topup',
    CASE v_tier WHEN 'starter' THEN 'starter_69' WHEN 'value' THEN 'value_119' WHEN 'pro' THEN 'pro_199' ELSE 'god_269' END,
    p_claimed_transfer_time, BTRIM(p_claimed_bank_account_last4), v_credit_to_apply
  ) RETURNING * INTO v_payment;

  RETURN json_build_object('id', v_payment.id, 'status', v_payment.status, 'amount', v_payment.amount);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_package_payment(TEXT, NUMERIC, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_package_payment(TEXT, NUMERIC, TEXT, TIMESTAMPTZ, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_payment_transaction(p_payment_id UUID, p_admin_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.payments%ROWTYPE;
  out_credits NUMERIC;
  out_tier TEXT;
  out_premium INTEGER;
  out_permanent INTEGER;
  out_custom INTEGER;
  out_expiry TIMESTAMPTZ;
  is_package BOOLEAN;
  is_plain_topup BOOLEAN;
  is_addon BOOLEAN;
BEGIN
  SELECT * INTO p FROM public.payments WHERE id = p_payment_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment % does not exist or is not pending', p_payment_id USING ERRCODE = 'P0002'; END IF;
  IF p.claimed_transfer_time IS NULL OR p.claimed_bank_account_last4 IS NULL THEN
    RAISE EXCEPTION 'Payment % cannot be approved: transfer details are required', p_payment_id;
  END IF;

  UPDATE public.payments SET status = 'approved', approved_at = NOW() WHERE id = p_payment_id;
  is_package := p.package_type IS NOT NULL;
  is_plain_topup := p.payment_type = 'topup' AND NOT is_package;
  is_addon := p.payment_type IN ('add_on_custom_url', 'add_on_permanent');
  IF is_plain_topup THEN PERFORM public.increment_credits(p.user_id, ROUND(p.amount)::INTEGER); END IF;
  IF is_package THEN PERFORM public.apply_package_purchase(p.user_id, p.package_type, FALSE, p.claimed_transfer_time); END IF;
  IF is_addon THEN PERFORM public.apply_approved_add_on(p_payment_id); END IF;

  INSERT INTO public.admin_action_logs (admin_id, action, payment_id, payment_user_id, amount, reason)
  VALUES (p_admin_id, 'payment_approved', p.id, p.user_id, p.amount, NULL);
  SELECT credits, tier, premium_quota, permanent_quota, custom_url_quota, quota_expires_at
    INTO out_credits, out_tier, out_premium, out_permanent, out_custom, out_expiry
    FROM public.profiles WHERE id = p.user_id;
  RETURN json_build_object('success', TRUE, 'amount', p.amount, 'payment_type', p.payment_type,
    'package_type', p.package_type, 'credits', out_credits, 'tier', out_tier,
    'premium_quota', out_premium, 'permanent_quota', out_permanent,
    'custom_url_quota', out_custom, 'quota_expires_at', out_expiry);
END;
$$;
REVOKE ALL ON FUNCTION public.approve_payment_transaction(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_payment_transaction(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';

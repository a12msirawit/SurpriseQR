-- Fix ambiguous package_tier local variable references in wallet purchase RPCs.
-- Existing behavior and price/quota rules are unchanged.

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

-- 

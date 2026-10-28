ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quota_expires_at TIMESTAMPTZ;

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
      package_permanent_quota := 3;
      package_custom_url_quota := 3;
      package_premium_quota := 1;
    WHEN 'value', 'value_119', 'package_119', '119' THEN
      package_price := 119;
      package_tier := 'value';
      package_permanent_quota := 8;
      package_custom_url_quota := 8;
      package_premium_quota := 3;
    WHEN 'pro', 'pro_199', 'package_199', '199' THEN
      package_price := 199;
      package_tier := 'pro';
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
    WHEN 'vip' THEN 4
    ELSE 0
  END;
  package_tier_rank := CASE package_tier
    WHEN 'starter' THEN 1
    WHEN 'value' THEN 2
    WHEN 'pro' THEN 3
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

  IF package_price = 199 THEN
    new_permanent_quota := 2147483647;
    new_custom_url_quota := 2147483647;
    new_premium_quota := LEAST(2147483647::BIGINT, new_premium_quota::BIGINT + 10)::INTEGER;
  END IF;

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
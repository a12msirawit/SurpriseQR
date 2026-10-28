ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS package_type TEXT;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_package_type_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_package_type_check
  CHECK (package_type IS NULL OR package_type IN ('starter_69', 'value_119', 'pro_199'));

ALTER TABLE public.profiles
  ALTER COLUMN permanent_quota SET DEFAULT 0,
  ALTER COLUMN custom_url_quota SET DEFAULT 0,
  ALTER COLUMN premium_quota SET DEFAULT 0;

UPDATE public.profiles SET permanent_quota = 0, custom_url_quota = 0, premium_quota = 0 WHERE tier = 'free';

CREATE OR REPLACE FUNCTION public.reset_profile_quotas(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_tier TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT tier INTO current_tier FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  UPDATE public.profiles
  SET custom_url_quota = CASE current_tier WHEN 'guest' THEN 0 WHEN 'free' THEN 0 WHEN 'starter' THEN 3 WHEN 'value' THEN 8 WHEN 'pro' THEN 8 ELSE 2147483647 END,
      premium_quota = CASE current_tier WHEN 'starter' THEN 1 WHEN 'value' THEN 3 WHEN 'pro' THEN 10 ELSE 0 END,
      permanent_quota = CASE current_tier WHEN 'guest' THEN 0 WHEN 'free' THEN 0 WHEN 'starter' THEN 3 WHEN 'value' THEN 8 WHEN 'pro' THEN 2147483647 ELSE 2147483647 END,
      quota_reset_at = date_trunc('month', NOW())
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_package(p_package_type TEXT)
RETURNS TABLE(success BOOLEAN, tier TEXT, permanent_quota INTEGER, premium_quota INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_user_id UUID := auth.uid();
  package_price NUMERIC;
  package_tier TEXT;
  permanent_add INTEGER;
  premium_add INTEGER;
  current_credits NUMERIC;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  CASE p_package_type
    WHEN 'starter_69' THEN package_price := 69; package_tier := 'starter'; permanent_add := 3; premium_add := 1;
    WHEN 'value_119' THEN package_price := 119; package_tier := 'value'; permanent_add := 8; premium_add := 3;
    WHEN 'pro_199' THEN package_price := 199; package_tier := 'pro'; permanent_add := 2147483647; premium_add := 10;
    ELSE RAISE EXCEPTION 'Invalid package';
  END CASE;
  SELECT credits INTO current_credits FROM public.profiles WHERE id = current_user_id FOR UPDATE;
  IF current_credits IS NULL OR current_credits < package_price THEN RAISE EXCEPTION 'Insufficient credits'; END IF;
  UPDATE public.profiles
  SET credits = credits - package_price,
      tier = package_tier,
      permanent_quota = CASE WHEN package_tier = 'pro' THEN 2147483647 ELSE permanent_quota + permanent_add END,
      premium_quota = premium_quota + premium_add,
      custom_url_quota = CASE WHEN package_tier = 'pro' THEN 2147483647 ELSE custom_url_quota + permanent_add END
  WHERE id = current_user_id;
  RETURN QUERY SELECT TRUE, package_tier, (SELECT p.permanent_quota FROM public.profiles p WHERE p.id = current_user_id), (SELECT p.premium_quota FROM public.profiles p WHERE p.id = current_user_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.purchase_package(TEXT) TO authenticated;
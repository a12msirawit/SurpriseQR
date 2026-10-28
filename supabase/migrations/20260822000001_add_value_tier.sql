ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_tier_check CHECK (tier IN ('guest', 'free', 'starter', 'value', 'pro', 'vip'));

CREATE OR REPLACE FUNCTION public.reset_profile_quotas(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_tier TEXT;
BEGIN
	IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Not allowed'; END IF;
	SELECT tier INTO current_tier FROM public.profiles WHERE id = p_user_id FOR UPDATE;
	UPDATE public.profiles
	SET custom_url_quota = CASE current_tier WHEN 'guest' THEN 0 WHEN 'free' THEN 3 WHEN 'starter' THEN 3 WHEN 'value' THEN 8 WHEN 'pro' THEN 8 ELSE 2147483647 END,
			premium_quota = CASE current_tier WHEN 'starter' THEN 1 WHEN 'value' THEN 3 WHEN 'pro' THEN 10 ELSE 0 END,
			permanent_quota = CASE current_tier WHEN 'guest' THEN 0 WHEN 'free' THEN 3 WHEN 'starter' THEN 3 WHEN 'value' THEN 8 WHEN 'pro' THEN 2147483647 ELSE 2147483647 END,
			quota_reset_at = date_trunc('month', NOW())
	WHERE id = p_user_id;
END;
$$;
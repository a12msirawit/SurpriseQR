-- Tier quotas and card access fields. Existing columns remain for compatibility.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_tier_check;

UPDATE public.profiles SET tier = 'pro' WHERE tier = 'premium';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tier_check CHECK (tier IN ('guest', 'free', 'starter', 'pro', 'vip'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_url_quota INTEGER NOT NULL DEFAULT 3 CHECK (custom_url_quota >= 0),
  ADD COLUMN IF NOT EXISTS premium_quota INTEGER NOT NULL DEFAULT 0 CHECK (premium_quota >= 0),
  ADD COLUMN IF NOT EXISTS permanent_quota INTEGER NOT NULL DEFAULT 3 CHECK (permanent_quota >= 0),
  ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW());

UPDATE public.profiles
SET custom_url_quota = CASE tier WHEN 'guest' THEN 0 WHEN 'free' THEN 3 WHEN 'starter' THEN 5 WHEN 'pro' THEN 8 ELSE 2147483647 END,
    premium_quota = CASE tier WHEN 'starter' THEN 5 WHEN 'pro' THEN 12 ELSE 0 END,
    permanent_quota = CASE tier WHEN 'guest' THEN 0 WHEN 'free' THEN 3 WHEN 'starter' THEN 5 WHEN 'pro' THEN 15 ELSE 2147483647 END
WHERE quota_reset_at = date_trunc('month', NOW());

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS has_watermark BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS audio_type TEXT CHECK (audio_type IN ('youtube', 'mp3', 'video')),
  ADD COLUMN IF NOT EXISTS password TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_custom_slug ON public.cards(custom_slug) WHERE custom_slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reset_profile_quotas(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_tier TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT tier INTO current_tier FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  UPDATE public.profiles
  SET custom_url_quota = CASE current_tier WHEN 'guest' THEN 0 WHEN 'free' THEN 3 WHEN 'starter' THEN 5 WHEN 'pro' THEN 8 ELSE 2147483647 END,
      premium_quota = CASE current_tier WHEN 'starter' THEN 5 WHEN 'pro' THEN 12 ELSE 0 END,
      permanent_quota = CASE current_tier WHEN 'guest' THEN 0 WHEN 'free' THEN 3 WHEN 'starter' THEN 5 WHEN 'pro' THEN 15 ELSE 2147483647 END,
      quota_reset_at = date_trunc('month', NOW())
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_profile_quota(p_user_id UUID, p_quota TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  quota_value INTEGER;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Not allowed'; END IF;
  PERFORM public.reset_profile_quotas(p_user_id)
  WHERE (SELECT quota_reset_at < date_trunc('month', NOW()) FROM public.profiles WHERE id = p_user_id);
  EXECUTE format('SELECT %I FROM public.profiles WHERE id = $1 FOR UPDATE', p_quota) INTO quota_value USING p_user_id;
  IF quota_value IS NULL OR quota_value <= 0 THEN RETURN FALSE; END IF;
  EXECUTE format('UPDATE public.profiles SET %I = %I - 1 WHERE id = $1', p_quota, p_quota) USING p_user_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_profile_quotas(p_user_id UUID, p_quotas TEXT[])
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  quota_name TEXT;
  quota_value INTEGER;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Not allowed'; END IF;
  PERFORM public.reset_profile_quotas(p_user_id)
  WHERE (SELECT quota_reset_at < date_trunc('month', NOW()) FROM public.profiles WHERE id = p_user_id);
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  FOREACH quota_name IN ARRAY p_quotas LOOP
    IF quota_name NOT IN ('custom_url_quota', 'premium_quota', 'permanent_quota') THEN RETURN FALSE; END IF;
    EXECUTE format('SELECT %I FROM public.profiles WHERE id = $1', quota_name) INTO quota_value USING p_user_id;
    IF quota_value IS NULL OR quota_value <= 0 THEN RETURN FALSE; END IF;
  END LOOP;
  FOREACH quota_name IN ARRAY p_quotas LOOP
    EXECUTE format('UPDATE public.profiles SET %I = %I - 1 WHERE id = $1', quota_name, quota_name) USING p_user_id;
  END LOOP;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_profile_quotas(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_profile_quota(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_profile_quotas(UUID, TEXT[]) TO authenticated;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'topup',
  ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS add_on_applied_at TIMESTAMPTZ;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_payment_type_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_type_check
  CHECK (payment_type IN ('topup', 'add_on_custom_url', 'add_on_permanent'));

CREATE INDEX IF NOT EXISTS idx_payments_card_id ON public.payments(card_id);

CREATE OR REPLACE FUNCTION public.apply_approved_add_on(p_payment_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  selected_payment public.payments%ROWTYPE;
BEGIN
  SELECT * INTO selected_payment FROM public.payments
  WHERE id = p_payment_id AND status = 'approved' AND add_on_applied_at IS NULL FOR UPDATE;
  IF NOT FOUND OR selected_payment.payment_type = 'topup' THEN RETURN; END IF;
  IF selected_payment.payment_type = 'add_on_custom_url' THEN
    UPDATE public.profiles SET custom_url_quota = custom_url_quota + 1
    WHERE id = selected_payment.user_id;
  ELSIF selected_payment.payment_type = 'add_on_permanent' THEN
    IF selected_payment.card_id IS NULL THEN RAISE EXCEPTION 'Permanent add-on requires a card'; END IF;
    UPDATE public.cards SET is_permanent = TRUE, storage_type = 'permanent', expires_at = NULL
    WHERE id = selected_payment.card_id AND user_id = selected_payment.user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Card not found or not owned by user'; END IF;
  END IF;
  UPDATE public.payments SET add_on_applied_at = NOW() WHERE id = p_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_approved_add_on(UUID) TO service_role;

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('add_on_custom_url', 'add_on_permanent')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON public.transactions(user_id, created_at DESC);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.purchase_add_on(p_type TEXT, p_card_id UUID DEFAULT NULL)
RETURNS TABLE(success BOOLEAN, remaining_credits NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_credits NUMERIC; v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL OR p_type <> 'add_on_permanent' THEN RAISE EXCEPTION 'Invalid add-on'; END IF;
  IF p_type = 'add_on_permanent' AND p_card_id IS NULL THEN RAISE EXCEPTION 'Card is required'; END IF;
  SELECT credits INTO current_credits FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF current_credits IS NULL OR current_credits < 25 THEN RAISE EXCEPTION 'Insufficient credits'; END IF;
  IF p_type = 'add_on_permanent' AND NOT EXISTS (SELECT 1 FROM public.cards WHERE id = p_card_id AND user_id = v_user_id) THEN RAISE EXCEPTION 'Card not found'; END IF;
  UPDATE public.profiles SET credits = credits - 25, custom_url_quota = custom_url_quota + 1 WHERE id = v_user_id;
  UPDATE public.cards SET is_permanent = TRUE, storage_type = 'permanent', expires_at = NULL WHERE id = p_card_id AND user_id = v_user_id;
  INSERT INTO public.transactions(user_id, transaction_type, amount, card_id) VALUES (v_user_id, p_type, 25, p_card_id);
  RETURN QUERY SELECT TRUE, current_credits - 25;
END;
$$;
GRANT EXECUTE ON FUNCTION public.purchase_add_on(TEXT, UUID) TO authenticated;

INSERT INTO public.templates (id, title, category, is_premium, preview_url)
VALUES ('10000000-0000-4000-8000-000000000003', 'Minimal Test', 'event', FALSE, '/templates/galaxy.png')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS image_1 TEXT,
  ADD COLUMN IF NOT EXISTS image_2 TEXT;
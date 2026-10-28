-- SurpriseQR: Initial schema
-- Tables: profiles, templates, cards, payments

-- Custom enum-like check constraints via text + CHECK

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('birthday', 'love', 'thanks', 'sorry', 'event')
  ),
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  preview_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.templates (id) ON DELETE RESTRICT,
  recipient_name TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  audio_url TEXT,
  pin_code TEXT CHECK (pin_code IS NULL OR pin_code ~ '^\d{4}$'),
  hash_id TEXT NOT NULL UNIQUE,
  expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  slip_url TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cards_user_id ON public.cards (user_id);
CREATE INDEX idx_cards_hash_id ON public.cards (hash_id);
CREATE INDEX idx_cards_template_id ON public.cards (template_id);
CREATE INDEX idx_payments_user_id ON public.payments (user_id);
CREATE INDEX idx_payments_status ON public.payments (status);
CREATE INDEX idx_templates_category ON public.templates (category);

-- Auto-create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Admin helper for RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Public card lookup by hash_id (used by /c/[hash_id] viewer)
CREATE OR REPLACE FUNCTION public.get_card_by_hash(card_hash_id TEXT)
RETURNS SETOF public.cards
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.cards
  WHERE hash_id = card_hash_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_card_by_hash(TEXT) TO anon, authenticated;

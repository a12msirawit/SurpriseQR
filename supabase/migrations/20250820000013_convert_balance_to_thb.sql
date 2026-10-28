ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ALTER COLUMN credits TYPE NUMERIC(12, 2)
  USING credits::NUMERIC(12, 2);

DROP FUNCTION IF EXISTS public.increment_credits(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.increment_credits(user_id UUID, amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET credits = credits + amount
  WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_credits(UUID, NUMERIC)
  TO authenticated;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS credits_granted NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.payments
  ALTER COLUMN credits_granted TYPE NUMERIC(12, 2)
  USING credits_granted::NUMERIC(12, 2);

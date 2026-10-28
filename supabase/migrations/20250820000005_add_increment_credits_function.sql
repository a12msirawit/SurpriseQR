-- Add function to safely increment user credits
CREATE OR REPLACE FUNCTION public.increment_credits(user_id UUID, amount INTEGER)
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

GRANT EXECUTE ON FUNCTION public.increment_credits(UUID, INTEGER) TO authenticated;

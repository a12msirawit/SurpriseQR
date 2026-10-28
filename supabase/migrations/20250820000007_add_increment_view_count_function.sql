-- Add function to increment card view count
CREATE OR REPLACE FUNCTION public.increment_view_count(card_hash_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cards
  SET view_count = view_count + 1
  WHERE hash_id = card_hash_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_view_count(TEXT) TO anon, authenticated;

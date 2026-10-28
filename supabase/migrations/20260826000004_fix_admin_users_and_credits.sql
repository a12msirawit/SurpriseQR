-- Fix: Add missing is_banned column to profiles and resolve increment_credits ambiguity
-- This migration ensures the admin user management system works correctly

-- 1) Add is_banned column if it doesn't exist (safe migration)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

-- 2) Drop all existing increment_credits function signatures to resolve PGRST203 ambiguity
DROP FUNCTION IF EXISTS public.increment_credits(uuid, integer);
DROP FUNCTION IF EXISTS public.increment_credits(uuid, numeric);

-- 3) Create a single, clean increment_credits function with INTEGER signature
CREATE OR REPLACE FUNCTION public.increment_credits(user_id UUID, amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET credits = COALESCE(credits, 0) + amount
  WHERE id = user_id;
END;
$$;

-- 4) Grant execute only to service_role (admin routes use service-role client)
REVOKE EXECUTE ON FUNCTION public.increment_credits(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_credits(UUID, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_credits(UUID, INTEGER) TO service_role;

-- 5) Ensure credits column exists with proper default
ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 0;
ALTER TABLE public.profiles ALTER COLUMN credits SET NOT NULL;

-- 6) Reload schema cache
NOTIFY pgrst, 'reload schema';

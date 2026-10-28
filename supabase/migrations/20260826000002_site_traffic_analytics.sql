-- ============================================================
-- Global Site Traffic Analytics (site_visits)
--
-- Replaces the ADMIN-FACING "Total Card Views" metric with a global
-- website-traffic counter for the Admin Dashboard.
--
-- ZERO BREAKING: card-opening behaviour (/c/[hash_id] ->
-- increment_view_count, card_views, cards.view_count) is intentionally
-- LEFT UNTOUCHED so recipients opening shared cards are unaffected.
--
-- DEDUP MODEL: each browser tab session generates a UUID kept in
-- sessionStorage ("visitor_session_id"). Every visited route logs one
-- row tagged with that same session id, so repeated navigation inside
-- one session never inflates UNIQUE VISITORS (COUNT(DISTINCT session_id)).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  session_id TEXT NOT NULL,
  path TEXT,
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
);

CREATE INDEX IF NOT EXISTS idx_site_visits_created_at
  ON public.site_visits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_session_id
  ON public.site_visits (session_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_user_id
  ON public.site_visits (user_id);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Writes happen ONLY through the SECURITY DEFINER RPC below, so no broad
-- INSERT policy is exposed. Reads stay restricted to admins.
DROP POLICY IF EXISTS "Admins can view site visits" ON public.site_visits;
CREATE POLICY "Admins can view site visits"
  ON public.site_visits
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Records one site visit. Runs as definer so anonymous visitors can log
-- traffic without needing an INSERT policy on the table itself; the acting
-- authenticated user (if any) is captured automatically via auth.uid().
CREATE OR REPLACE FUNCTION public.log_site_visit(p_session_id TEXT, p_path TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NULL OR btrim(p_session_id) = '' THEN
    RAISE EXCEPTION 'p_session_id is required';
  END IF;

  INSERT INTO public.site_visits (session_id, path, user_id)
  VALUES (
    left(btrim(p_session_id), 128),
    NULLIF(left(btrim(COALESCE(p_path, '/')), 512), ''),
    auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_site_visit(TEXT, TEXT) TO anon, authenticated;
-- ============================================================================
-- Security RLS closure + schema convergence for production (idempotent).
--
-- WHY:
--   1) The live `cards` policy "Public can read cards by hash_id"
--      (USING (hash_id IS NOT NULL)) lets ANONYMOUS read the ENTIRE cards
--      table, including pin_code / password / user_id (verified on prod).
--   2) Legacy SECURITY DEFINER `get_card_by_hash` is exposed to anon/
--      authenticated and returns full rows; no app code calls it.
--   3) Production has drifted: admin_action_logs, card_views, site_visits +
--      log_site_visit() are MISSING live, which breaks /api/admin/approve
--      (its RPC always INSERTs into admin_action_logs then RAISEs) and leaves
--      the site-traffic tracker with no target table.
--   4) templates parity columns (name/slug/tier) from 20260826000001 are
--      NOT on live.
--
-- SAFETY: additive/idempotent throughout (DROP-then-CREATE policies,
-- CREATE OR REPLACE functions, ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT
-- EXISTS, constraint widen). Safe on prod and fresh `supabase db reset`.
--
-- SCOPE NOTE: pin_code/password are CLOSED for the anonymous role only.
-- Keeping them readable by `authenticated` preserves owner dashboard/edit
-- flows that currently read via `select("*")`. Full owner-only restriction
-- is a follow-up (owner-secrets RPC refactor), out of this migration.
-- ============================================================================

-- [1] cards — close the anonymous read leak -------------------------------

-- The policy predicates below reference cards.is_public (present on prod but
-- not in the tracked migration chain). Ensure it exists so this file is also
-- valid on a fresh `supabase db reset`. Additive + idempotent; no data change.
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

-- Replace the overly-broad public policy with scoped ones.
DROP POLICY IF EXISTS "Public can read cards by hash_id" ON public.cards;

-- Anonymous may read ONLY public (non-hidden/flagged, is_public) cards.
DROP POLICY IF EXISTS "Anyone can read public cards" ON public.cards;
CREATE POLICY "Anyone can read public cards"
  ON public.cards
  FOR SELECT
  TO anon
  USING (
    hash_id IS NOT NULL
    AND COALESCE(is_public, TRUE)
    AND COALESCE(status, 'published') IN ('published', 'active')
  );

-- Authenticated may read THEIR OWN cards (any status incl. drafts), OR
-- public cards (so logged-in share-link visitors still work), OR all if
-- admin. Preserves owner dashboard/draft flows.
DROP POLICY IF EXISTS "Authenticated read own or public cards" ON public.cards;
CREATE POLICY "Authenticated read own or public cards"
  ON public.cards
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin()
    OR (
      hash_id IS NOT NULL
      AND COALESCE(is_public, TRUE)
      AND COALESCE(status, 'published') IN ('published', 'active')
    )
  );

-- Column-level withhold of secrets from ANONYMOUS (belt & braces).
REVOKE SELECT (pin_code, password, user_id) ON public.cards FROM anon;

-- Close the legacy SECURITY DEFINER exfil channel (no app dependency).
REVOKE EXECUTE ON FUNCTION public.get_card_by_hash(TEXT) FROM anon, authenticated;

-- PIN verification RPC — compares server-side, NEVER returns the pin.
CREATE OR REPLACE FUNCTION public.verify_card_pin(p_hash_id TEXT, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin public.cards.pin_code%TYPE;
BEGIN
  SELECT c.pin_code
    INTO v_pin
    FROM public.cards c
   WHERE c.hash_id = p_hash_id OR c.custom_slug = p_hash_id
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;  -- signals "card not found" vs "no pin / mismatch"
  END IF;

  -- No stored pin -> the card is open (matches previous behaviour).
  IF v_pin IS NULL OR BTRIM(v_pin) = '' THEN
    RETURN TRUE;
  END IF;

  RETURN BTRIM(COALESCE(p_pin, '')) = BTRIM(v_pin);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_card_pin(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_card_pin(TEXT, TEXT) TO anon, authenticated;

-- [2] cards.status — widen CHECK to moderation values used by
--     /api/admin/cards/[id] (20260826000001 parity). Widening only.
ALTER TABLE public.cards
  DROP CONSTRAINT IF EXISTS cards_status_check;

ALTER TABLE public.cards
  ADD CONSTRAINT cards_status_check
  CHECK (status IN ('draft', 'published', 'active', 'hidden', 'flagged'));

-- [3] admin_action_logs — append-only admin audit trail
--     (20250825000001 parity; fixes broken approve RPC + reject audit)
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('payment_approved', 'payment_rejected')),
  payment_id UUID REFERENCES public.payments (id) ON DELETE SET NULL,
  payment_user_id UUID NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin action logs" ON public.admin_action_logs;
CREATE POLICY "Admins can view admin action logs"
  ON public.admin_action_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.admin_action_logs FROM anon, authenticated;
GRANT SELECT ON public.admin_action_logs TO authenticated;

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at
  ON public.admin_action_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_payment_id
  ON public.admin_action_logs (payment_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_id
  ON public.admin_action_logs (admin_id, created_at DESC);

-- [4] card_views — per-card analytics (20260826000001 parity)
CREATE TABLE IF NOT EXISTS public.card_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.cards (id) ON DELETE CASCADE,
  ip_address TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_views_card_id
  ON public.card_views (card_id);
CREATE INDEX IF NOT EXISTS idx_card_views_viewed_at
  ON public.card_views (viewed_at DESC);

ALTER TABLE public.card_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert card views" ON public.card_views;
CREATE POLICY "Anyone can insert card views"
  ON public.card_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admins can view card views" ON public.card_views;
CREATE POLICY "Admins can view card views"
  ON public.card_views
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete card views" ON public.card_views;
CREATE POLICY "Admins can delete card views"
  ON public.card_views
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- [5] site_visits + log_site_visit — global traffic analytics
--     (20260826000002 parity; un-breaks <SiteTracker/> + /admin)
CREATE TABLE IF NOT EXISTS public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  path TEXT,
  user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_visits_created_at
  ON public.site_visits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_session_id
  ON public.site_visits (session_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_user_id
  ON public.site_visits (user_id);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view site visits" ON public.site_visits;
CREATE POLICY "Admins can view site visits"
  ON public.site_visits
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

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

REVOKE ALL ON FUNCTION public.log_site_visit(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_site_visit(TEXT, TEXT) TO anon, authenticated;

-- [6] templates — parity columns (20260826000001 parity, additive)
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';

ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE public.templates
   SET slug = 'tpl-' || substr(md5(id::text), 1, 12)
 WHERE slug IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'templates_slug_key' AND conrelid = 'public.templates'::regclass
  ) THEN
    ALTER TABLE public.templates
      ADD CONSTRAINT templates_slug_key UNIQUE (slug);
  END IF;
END $$;

ALTER TABLE public.templates ALTER COLUMN slug SET NOT NULL;

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'pro')),
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
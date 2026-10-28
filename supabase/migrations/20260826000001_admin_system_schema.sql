-- Admin system prep: templates upgrade, ban flag, moderation status, analytics.
--
-- NON-DESTRUCTIVE by design (ZERO COLLATERAL DAMAGE):
--   * public.templates ALREADY EXISTS (20250820000001: title/category/is_premium/
--     preview_url NOT NULL) and live code (src/app/admin/actions.ts,
--     src/lib/cards/create-card-core.ts) actively reads/writes those columns.
--     We therefore ADDITIVE-upgrade it instead of recreating, and keep every
--     legacy column/constraint working.
--   * public.cards.status ALREADY EXISTS since 20250820000010 as
--     CHECK (status IN ('draft','published')) DEFAULT 'published' and
--     /api/cron/cleanup-drafts depends on 'draft'. The requested moderation
--     values are UNION-ed into the CHECK instead of replacing it, and the
--     default stays 'published' so the card-creation flow is unchanged.
--   * All pre-existing RLS policies/functions are left intact; the only policy
--     touched is templates SELECT, whose old USING(TRUE) form directly
--     contradicts the required is_published gating (superseded below).

-- ============================================================
-- 1) templates: additive upgrade
-- ============================================================

-- name: NOT NULL with a neutral default so legacy inserts (title/category/
-- is_premium only, no name) keep succeeding until the admin UI migrates.
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';

-- slug: added nullable, backfilled deterministically from id, then pinned
-- NOT NULL + UNIQUE (constraint guarded for safe re-runs).
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

-- Auto-fill slug for legacy insert paths that omit it.
CREATE OR REPLACE FUNCTION public.ensure_template_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := 'tpl-' || substr(md5(gen_random_uuid()::text), 1, 12);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_template_slug ON public.templates;
CREATE TRIGGER trg_ensure_template_slug
  BEFORE INSERT ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.ensure_template_slug();

-- price/tier/is_published: brand-new columns.
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'pro')),
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;

-- category: widen the legacy CHECK ('general' is rejected by the current one)
-- and apply the requested default. Legacy categories stay valid; explicit
-- inserts from existing admin flows are untouched.
ALTER TABLE public.templates
  DROP CONSTRAINT IF EXISTS templates_category_check;

ALTER TABLE public.templates
  ADD CONSTRAINT templates_category_check CHECK (
    category IN ('birthday', 'love', 'thanks', 'sorry', 'event', 'general')
  );

ALTER TABLE public.templates ALTER COLUMN category SET DEFAULT 'general';

-- ============================================================
-- 2) profiles.is_banned
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 3) cards.status: extend moderation states (see header note)
-- ============================================================
ALTER TABLE public.cards
  DROP CONSTRAINT IF EXISTS cards_status_check;

ALTER TABLE public.cards
  ADD CONSTRAINT cards_status_check CHECK (
    status IN ('draft', 'published', 'active', 'hidden', 'flagged')
  );

-- ============================================================
-- 4) card_views (analytics)
-- ============================================================
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

-- Anyone may record a view (the public /c/[hash_id] page fires this without
-- a session); without these policies hosted Supabase default grants would
-- leave the table wide open.
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

-- ============================================================
-- 5) templates RLS: published-gated public reads + admin full access
--    (admin INSERT/UPDATE/DELETE policies from 20250820000002 already match
--    the requirement and are intentionally preserved as-is)
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read templates" ON public.templates;
DROP POLICY IF EXISTS "Anyone can read published templates" ON public.templates;
CREATE POLICY "Anyone can read published templates"
  ON public.templates
  FOR SELECT
  TO anon, authenticated
  USING (is_published = TRUE);

DROP POLICY IF EXISTS "Admins can manage all templates" ON public.templates;
CREATE POLICY "Admins can manage all templates"
  ON public.templates
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

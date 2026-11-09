-- ============================================================================
-- 20261103000001 — Seed the Blow Candles template
--
-- Adds the "Blow Candles" row to public.templates so it shows up in the
-- /admin dashboard and /dashboard catalog (getAllTemplates() reads published
-- rows only) and can be selected in /dashboard/create.
--
-- NOTES:
--   * Deterministic UUID follows the built-in seed convention
--     (10000000-0000-4000-8000-00000000000X).
--   * slug 'candles' matches the static catalog entry in src/data/templates.ts.
--   * is_published TRUE so it appears immediately in the catalog and create flow.
--   * is_premium FALSE, price 0 — free template.
--   * NON-DESTRUCTIVE: ON CONFLICT (id) DO NOTHING.
-- ============================================================================
INSERT INTO public.templates (
  id,
  name,
  slug,
  title,
  category,
  is_premium,
  price,
  preview_url,
  is_published
)
VALUES (
  '10000000-0000-4000-8000-000000000007',
  'Blow Candles',
  'candles',
  'Blow Candles',
  'birthday',
  FALSE,
  0,
  '/templates/cake-candles.png',
  TRUE
)
ON CONFLICT (id) DO NOTHING;
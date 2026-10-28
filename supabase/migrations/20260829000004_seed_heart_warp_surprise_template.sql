-- ============================================================================
-- 20260829000004 — Seed the Heart Warp Surprise template
--
-- Adds the "Heart Warp Surprise" row to public.templates so it shows up in the
-- /dashboard catalog (getAllTemplates() reads published rows only) and can be
-- selected in /dashboard/create.
--
-- NOTES:
--   * Deterministic UUID follows the built-in seed convention
--     (10000000-0000-4000-8000-00000000000X, see 20250820000011 and
--     20260822000003) and is registered as an alias in
--     src/data/templates.ts + src/lib/template-resolution.ts so cards created
--     with this template_id resolve to the heart-warp-surprise renderer.
--   * preview_url uses the existing /templates/rose.png asset (no dedicated
--     heart-warp.png exists in public/templates yet).
--   * is_premium TRUE per product decision; price stays 0 so the admin can
--     set the real price later (dashboard displays the DB price as-is).
--   * NON-DESTRUCTIVE: ON CONFLICT (id) DO NOTHING — existing Romantic Rose,
--     Galaxy Surprise and Simple Minimal rows are never touched.
-- ============================================================================
INSERT INTO public.templates (id, name, slug, title, category, is_premium, price, preview_url, is_published)
VALUES (
  '10000000-0000-4000-8000-000000000005',
  'Heart Warp Surprise',
  'heart-warp-surprise',
  'Heart Warp Surprise',
  'love',
  TRUE,
  0,
  '/templates/rose.png',
  TRUE
)
ON CONFLICT (id) DO NOTHING;
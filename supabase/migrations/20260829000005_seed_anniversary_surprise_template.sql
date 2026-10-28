-- ============================================================================
-- 20260829000005 — Seed the Anniversary Surprise template
--
-- Adds the "Anniversary Surprise" row to public.templates so it shows up in the
-- /dashboard catalog (getAllTemplates() reads published rows only) and can be
-- selected in /dashboard/create.
--
-- NOTES:
--   * Deterministic UUID follows the built-in seed convention
--     (10000000-0000-4000-8000-00000000000X, see 20250820000011,
--     20260822000003 and 20260829000004) and is registered as an alias in
--     src/data/templates.ts + src/lib/template-resolution.ts so cards created
--     with this template_id resolve to the anniversary-surprise renderer.
--   * preview_url uses the new /templates/surprise-qr.svg thumbnail committed
--     to public/templates.
--   * is_premium TRUE per product decision; price stays 0 so the admin can
--     set the real price later (dashboard displays the DB price as-is).
--   * NON-DESTRUCTIVE: ON CONFLICT (id) DO NOTHING.
-- ============================================================================
INSERT INTO public.templates (id, name, slug, title, category, is_premium, price, preview_url, preview_video_url, is_published)
VALUES (
  '10000000-0000-4000-8000-000000000006',
  'Anniversary Surprise',
  'anniversary-surprise',
  'Anniversary Surprise',
  'love',
  TRUE,
  0,
  '/templates/surprise-qr.svg',
  NULL,
  TRUE
)
ON CONFLICT (id) DO NOTHING;
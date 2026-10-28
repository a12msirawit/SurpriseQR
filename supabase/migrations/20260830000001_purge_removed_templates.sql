-- ============================================================================
-- Purge decommissioned templates (Romantic Rose, Heart Warp Surprise,
-- Simple Minimal / Minimal Test / Premium Minimal, Galaxy / 3D Cosmic Galaxy,
-- Interactive Gift Box) so they no longer appear anywhere in the app.
--
-- This version FIXES the error:
--   null value in column "template_id" of relation "cards" violates
--   not-null constraint
-- by first reassigning EVERY card that references a decommissioned template
-- to the Anniversary Surprise template, and only then deleting the rows.
-- ============================================================================

-- 1) Ensure the Anniversary Surprise replacement row exists (idempotent).
INSERT INTO public.templates (
  id, name, slug, title, category, is_premium, price, preview_url,
  preview_video_url, is_published
)
SELECT
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
WHERE NOT EXISTS (
  SELECT 1 FROM public.templates WHERE id = '10000000-0000-4000-8000-000000000006'
)
AND NOT EXISTS (
  SELECT 1 FROM public.templates WHERE slug = 'anniversary-surprise'
);

-- 2) Reassign all cards that reference any decommissioned template to the
--    Anniversary Surprise template (never NULL -> no NOT-NULL violation).
UPDATE public.cards
SET template_id = '10000000-0000-4000-8000-000000000006'
WHERE template_id IN (
  SELECT id FROM public.templates
  WHERE id IN (
    '10000000-0000-4000-8000-000000000001', -- 3D Cosmic Galaxy
    '10000000-0000-4000-8000-000000000002', -- Interactive Gift Box
    '10000000-0000-4000-8000-000000000003', -- Minimal Test
    '10000000-0000-4000-8000-000000000004', -- Premium Minimal
    '10000000-0000-4000-8000-000000000005'  -- Heart Warp Surprise
  )
  OR slug IN (
    'romantic-rose',
    'galaxy-surprise',
    'heart-warp-surprise',
    'simple-minimal',
    'simple-minimal-test'
  )
  OR title IN (
    'Romantic Rose',
    '3D Cosmic Galaxy',
    'Interactive Gift Box',
    'Minimal Test',
    'การ์ดพรีเมียมมินิมอล',
    'Heart Warp Surprise'
  )
);

-- 3) Permanently delete every decommissioned row. Safe now: no card in the
--    database references them anymore (all were reassigned in step 2).
DELETE FROM public.templates
WHERE (
  id IN (
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000005'
  )
  OR slug IN (
    'romantic-rose',
    'galaxy-surprise',
    'heart-warp-surprise',
    'simple-minimal',
    'simple-minimal-test'
  )
  OR title IN (
    'Romantic Rose',
    '3D Cosmic Galaxy',
    'Interactive Gift Box',
    'Minimal Test',
    'การ์ดพรีเมียมมินิมอล',
    'Heart Warp Surprise'
  )
)
AND id <> '10000000-0000-4000-8000-000000000006';
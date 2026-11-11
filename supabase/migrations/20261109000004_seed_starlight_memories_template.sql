-- Add Starlight Memories template to the published template catalog.
-- UUID 0012 follows the existing deterministic template seed sequence.
INSERT INTO public.templates (
  id, name, slug, title, category, is_premium, price, preview_url, is_published
)
VALUES (
  '10000000-0000-4000-8000-000000000012',
  'Starlight Memories',
  'starlight-memories',
  'Starlight Memories',
  'love',
  FALSE,
  0,
  '/templates/starlight-memories.svg',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  preview_url = EXCLUDED.preview_url,
  is_published = EXCLUDED.is_published;


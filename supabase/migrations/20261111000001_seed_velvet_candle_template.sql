-- Add Velvet Candle & Cake (Interactive Birthday) template to the published template catalog.
-- UUID 0013 follows the existing deterministic template seed sequence.
INSERT INTO public.templates (
  id, name, slug, title, category, is_premium, price, preview_url, is_published
)
VALUES (
  '10000000-0000-4000-8000-000000000013',
  'Velvet Candle & Cake (Interactive Birthday)',
  'velvet-candle',
  'Velvet Candle & Cake',
  'birthday',
  FALSE,
  0,
  '/templates/velvet-candle.svg',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  preview_url = EXCLUDED.preview_url,
  is_published = EXCLUDED.is_published;


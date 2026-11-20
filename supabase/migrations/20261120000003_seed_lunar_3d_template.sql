-- Seed Lunar Secret 3D interactive WebGL 360-degree Moon template.
INSERT INTO public.templates (
  id, name, slug, title, category, is_premium, price, preview_url, is_published
)
VALUES (
  '10000000-0000-4000-8000-000000000019',
  'Lunar Secret 3D',
  'lunar-3d',
  'Lunar Secret 3D',
  'love',
  FALSE,
  0,
  '/templates/lunar-3d.svg',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  preview_url = EXCLUDED.preview_url,
  is_published = EXCLUDED.is_published;


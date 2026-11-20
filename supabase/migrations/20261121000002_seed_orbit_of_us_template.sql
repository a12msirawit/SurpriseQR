-- Seed Orbit of Us 3D interactive WebGL 360-degree Galaxy & 3D Heart Morph template.
INSERT INTO public.templates (
  id, name, slug, title, category, is_premium, price, preview_url, is_published
)
VALUES (
  '10000000-0000-4000-8000-000000000020',
  'Orbit of Us 3D',
  'orbit-of-us',
  'Orbit of Us 3D',
  'love',
  TRUE,
  69,
  '/templates/orbit-of-us.svg',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  is_premium = EXCLUDED.is_premium,
  price = EXCLUDED.price,
  preview_url = EXCLUDED.preview_url,
  is_published = EXCLUDED.is_published;


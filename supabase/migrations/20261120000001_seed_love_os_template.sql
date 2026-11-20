-- Seed Love OS · Desktop Confession interactive Y2K love computer template.
INSERT INTO public.templates (
  id, name, slug, title, category, is_premium, price, preview_url, is_published
)
VALUES (
  '10000000-0000-4000-8000-000000000017',
  'Love OS · Desktop Confession',
  'love-os',
  'Love OS · Desktop Confession',
  'love',
  FALSE,
  0,
  '/templates/love-os.svg',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  preview_url = EXCLUDED.preview_url,
  is_published = EXCLUDED.is_published;


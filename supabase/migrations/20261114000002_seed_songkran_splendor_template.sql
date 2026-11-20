-- Seed Songkran Splendor festival template in the published catalog ('thanks' = เทศกาล).
-- Note: templates_category_check already permits 'thanks' via 20261114000001.
INSERT INTO public.templates (
  id, name, slug, title, category, is_premium, price, preview_url, is_published
)
VALUES (
  '10000000-0000-4000-8000-000000000015',
  'Songkran Splendor',
  'songkran-splendor',
  'Songkran Splendor',
  'thanks',
  FALSE,
  0,
  '/templates/songkran-splendor.svg',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  preview_url = EXCLUDED.preview_url,
  is_published = EXCLUDED.is_published;


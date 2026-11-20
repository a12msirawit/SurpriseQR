-- Seed Midnight Haunted Abyss Halloween interactive scroll template ('thanks' = เทศกาล).
INSERT INTO public.templates (
  id, name, slug, title, category, is_premium, price, preview_url, is_published
)
VALUES (
  '10000000-0000-4000-8000-000000000016',
  'Midnight Haunted Abyss',
  'halloween-haunted-scroll',
  'Midnight Haunted Abyss',
  'thanks',
  FALSE,
  0,
  '/templates/halloween-haunted-scroll.svg',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  preview_url = EXCLUDED.preview_url,
  is_published = EXCLUDED.is_published;


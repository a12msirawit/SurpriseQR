-- Add the Storyline template to the published template catalog.
-- UUID 0008 follows the existing deterministic template seed sequence.
INSERT INTO public.templates (
  id, name, slug, title, category, is_premium, price, preview_url, is_published
)
VALUES (
  '10000000-0000-4000-8000-000000000008',
  'Storyline',
  'storyline',
  'Storyline',
  'love',
  FALSE,
  0,
  '/templates/storyline.svg',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

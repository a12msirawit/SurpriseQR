-- Add Retro Windows 98 / Y2K Edition template to the published template catalog.
-- UUID 0009 follows the existing deterministic template seed sequence.
INSERT INTO public.templates (
  id, name, slug, title, category, is_premium, price, preview_url, is_published
)
VALUES (
  '10000000-0000-4000-8000-000000000009',
  'Retro Windows 98 / Y2K Edition',
  'retro-y2k',
  'Retro Windows 98 / Y2K Edition',
  'love',
  FALSE,
  0,
  '/templates/retro-y2k.svg',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  preview_url = EXCLUDED.preview_url,
  is_published = EXCLUDED.is_published;

-- Ensure templates_category_check permits 'thanks' (เทศกาล) alongside all existing categories.
ALTER TABLE public.templates
  DROP CONSTRAINT IF EXISTS templates_category_check;

ALTER TABLE public.templates
  ADD CONSTRAINT templates_category_check CHECK (
    category IN ('birthday', 'love', 'thanks', 'sorry', 'event', 'general', 'festival')
  ) NOT VALID;

-- Add Grand New Year Celebration template to the published template catalog (Festival / thanks category).
-- UUID 0014 follows the existing deterministic template seed sequence.
INSERT INTO public.templates (
  id, name, slug, title, category, is_premium, price, preview_url, is_published
)
VALUES (
  '10000000-0000-4000-8000-000000000014',
  'Grand New Year Celebration',
  'new-year-grand-celebration',
  'Grand New Year Celebration',
  'thanks',
  FALSE,
  0,
  '/templates/grand-new-year.svg',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  preview_url = EXCLUDED.preview_url,
  is_published = EXCLUDED.is_published;

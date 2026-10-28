-- Seed the Romantic Rose template
INSERT INTO public.templates (title, category, preview_url, is_published, price)
VALUES ('Romantic Rose', 'love', '/templates/rose.png', true, 0)
ON CONFLICT DO NOTHING;

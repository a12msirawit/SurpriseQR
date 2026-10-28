-- Seed the templates that are built into the application catalog.
INSERT INTO public.templates (id, title, category, is_premium, preview_url)
VALUES
  ('10000000-0000-4000-8000-000000000001', '3D Cosmic Galaxy', 'love', FALSE, '/templates/galaxy.png'),
  ('10000000-0000-4000-8000-000000000002', 'Interactive Gift Box', 'event', FALSE, '/templates/galaxy.png'),
  ('10000000-0000-4000-8000-000000000003', 'Minimal Test', 'event', FALSE, '/templates/galaxy.png')
ON CONFLICT (id) DO NOTHING;
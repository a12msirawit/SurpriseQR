INSERT INTO public.templates (id, title, category, is_premium, preview_url)
VALUES ('10000000-0000-4000-8000-000000000004', 'การ์ดพรีเมียมมินิมอล', 'event', TRUE, '/templates/galaxy.png')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, is_premium = TRUE, preview_url = EXCLUDED.preview_url;
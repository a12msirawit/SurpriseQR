-- ============================================================================
-- 20260829000002 — Template preview video + external demo links
--
-- ADDITIVE-ONLY (zero collateral damage):
--   * public.templates gains two new columns:
--       - preview_video_url TEXT NULL
--           Public URL of the uploaded template preview video (Supabase
--           Storage 'template-previews' bucket, see 20260829000003).
--           NULL = the dashboard falls back to the static preview image.
--       - demo_video_links JSONB NOT NULL DEFAULT '{}'
--           External demo links shaped { "tiktok", "youtube", "facebook",
--           "instagram" } (values may be "" when unset for a platform).
--   * No existing column/constraint/policy is touched; legacy inserts that
--     omit both columns keep working unchanged.
-- ============================================================================

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS preview_video_url TEXT;

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS demo_video_links JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.templates.preview_video_url IS
  'Public URL of the uploaded template preview video (storage bucket: template-previews). NULL = use the static preview image.';

COMMENT ON COLUMN public.templates.demo_video_links IS
  'External demo links: {"tiktok":"","youtube":"","facebook":"","instagram":""}';

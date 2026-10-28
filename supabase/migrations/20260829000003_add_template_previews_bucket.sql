-- ============================================================================
-- 20260829000003 — 'template-previews' storage bucket
--
-- Public bucket holding admin-uploaded template preview videos (MP4/WebM,
-- max 10 seconds enforced client-side by the admin form). Mirrors the bucket
-- style of 20250820000003_storage_buckets.sql:
--   * public read so dashboard template cards can stream the video directly
--   * only admins (public.is_admin()) may upload/replace/remove objects
-- IDEMPOTENT: bucket upsert + DROP POLICY IF EXISTS guards make re-runs safe.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'template-previews',
  'template-previews',
  TRUE,
  52428800, -- 50 MB headroom for a 10s MP4/WebM clip
  ARRAY['video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Anyone (including guests) may stream preview videos.
DROP POLICY IF EXISTS "Public read template previews" ON storage.objects;
CREATE POLICY "Public read template previews"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'template-previews');

-- Only admins may upload/replace/delete preview videos (admin edit form).
DROP POLICY IF EXISTS "Admins manage all template previews" ON storage.objects;
CREATE POLICY "Admins manage all template previews"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'template-previews'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'template-previews'
    AND public.is_admin()
  );

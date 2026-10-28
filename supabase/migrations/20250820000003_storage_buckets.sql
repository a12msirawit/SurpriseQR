-- SurpriseQR: Storage buckets and policies

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'card-media',
  'card-media',
  TRUE,
  20971520,
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'audio/mpeg', 'audio/wav', 'audio/mp3']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'slips',
  'slips',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- card-media: public read; authenticated users upload to own folder
CREATE POLICY "Public read card media"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'card-media');

CREATE POLICY "Users upload own card media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'card-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own card media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'card-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'card-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own card media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'card-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins manage all card media"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'card-media'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'card-media'
    AND public.is_admin()
  );

-- slips: users upload/read own; admins full access
CREATE POLICY "Users read own payment slips"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'slips'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

CREATE POLICY "Users upload own payment slips"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'slips'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own payment slips"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'slips'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'slips'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own payment slips"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'slips'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins manage all payment slips"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'slips'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'slips'
    AND public.is_admin()
  );

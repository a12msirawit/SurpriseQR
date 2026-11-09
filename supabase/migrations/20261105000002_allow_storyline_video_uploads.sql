-- Allow Storyline video files in the existing card-media bucket.
-- Keep the current 20 MiB bucket limit and all previously allowed types.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY(
  SELECT DISTINCT mime_type
  FROM unnest(
    COALESCE(allowed_mime_types, ARRAY[]::text[])
    || ARRAY['video/mp4', 'video/webm']::text[]
  ) AS mime_types(mime_type)
  ORDER BY mime_type
)
WHERE id = 'card-media';

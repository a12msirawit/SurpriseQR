-- Increase card-media bucket file size limit to 1 GiB (1,073,741,824 bytes)
-- to allow up to 1 GB media uploads for God Pack, 500 MB for Pro Pack, and 300 MB for Value/Premium templates.
UPDATE storage.buckets
SET file_size_limit = 1073741824
WHERE id = 'card-media';


-- Allow admins to choose whether an unpublished template remains visible on the dashboard for admins only.
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS admin_preview_visible BOOLEAN NOT NULL DEFAULT TRUE;


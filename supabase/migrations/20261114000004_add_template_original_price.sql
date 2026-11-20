-- Add original_price to templates for discount / sale pricing display
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2) DEFAULT NULL;


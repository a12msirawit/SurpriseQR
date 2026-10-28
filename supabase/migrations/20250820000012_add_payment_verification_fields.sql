ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS credits_granted INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reject_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_payments_pending
  ON public.payments (status, created_at DESC);

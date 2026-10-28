-- Admin action audit log (append-only).
--
-- Records every privileged payment action (approve / reject) performed by an
-- admin, with a snapshot of the affected payment's REAL columns:
--   payments.user_id  -> payment_user_id (UUID, references profiles.id)
--   payments.amount   -> amount          (NUMERIC(10,2), matches payments.amount)
-- Snapshots keep the audit trail intact even if the payment row (or the payer's
-- profile, which cascades payment deletes) is later removed.
--
-- Write path: the /api/admin/payments/* routes already run behind requireAdmin()
-- and execute privileged statements with the service-role key, which bypasses
-- RLS. The table therefore intentionally ships with:
--   - a SELECT policy for admins only,
--   - NO INSERT/UPDATE/DELETE policies, and table-level INSERT/UPDATE/DELETE
--     revoked from anon/authenticated, making it append-only for every client.
-- Privileged server-side code (service_role) retains full access.

CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- profiles.id of the acting admin. FK with ON DELETE SET NULL so logs survive
  -- admin-account deletion (the column is only ever written at insert time by
  -- the service-role write path; a deleted admin simply nulls out old rows).
  admin_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('payment_approved', 'payment_rejected')),
  -- Kept as FK with SET NULL so payments can be cleaned up without destroying
  -- the log row; the snapshot columns below preserve the context.
  payment_id UUID REFERENCES public.payments (id) ON DELETE SET NULL,
  -- Snapshot of payments.user_id at action time.
  payment_user_id UUID NOT NULL,
  -- Snapshot of payments.amount at action time. NOT NULL because every logged
  -- action references an existing payment whose amount is itself NOT NULL, so
  -- a missing snapshot can only mean a bug in the write path.
  amount NUMERIC(10, 2) NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_action_logs_amount_check CHECK (amount > 0)
);

COMMENT ON TABLE public.admin_action_logs IS
  'Append-only audit trail of admin payment actions. Written only via service role.';
COMMENT ON COLUMN public.admin_action_logs.admin_id IS
  'profiles.id of the acting admin (FK, ON DELETE SET NULL so logs survive account deletion).';
COMMENT ON COLUMN public.admin_action_logs.payment_user_id IS
  'Snapshot of payments.user_id at the time of the action.';
COMMENT ON COLUMN public.admin_action_logs.amount IS
  'Snapshot of payments.amount at the time of the action.';

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin action logs" ON public.admin_action_logs;
CREATE POLICY "Admins can view admin action logs"
  ON public.admin_action_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Append-only enforcement at the privilege layer (RLS covers row visibility;
-- these revokes close direct DML from regular clients).
REVOKE INSERT, UPDATE, DELETE ON public.admin_action_logs FROM anon, authenticated;
GRANT SELECT ON public.admin_action_logs TO authenticated;

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at
  ON public.admin_action_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_payment_id
  ON public.admin_action_logs (payment_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_id
  ON public.admin_action_logs (admin_id, created_at DESC);

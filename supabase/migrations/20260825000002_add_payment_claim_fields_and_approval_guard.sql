-- Payment claim fields + approval guard.
--
-- 1) New nullable columns on public.payments capture what the PAYER claims at
--    slip-submission time (collected by POST /api/payments/submit):
--      claimed_transfer_time       TIMESTAMPTZ - when the user says they transferred
--      claimed_bank_account_last4  TEXT        - last 4 digits of the originating bank account
--
-- 2) Guard rails (DB-level second line of defense):
--    a) A payment cannot transition to 'approved' unless BOTH claim fields are
--       present on the row ("must be filled before approve"). Only transitions
--       INTO approved are guarded, so historical approved rows stay valid.
--    b) Regular clients can never INSERT a payment whose status is not
--       'pending'. The existing INSERT policy ("Users can submit own payments")
--       only checks ownership, which would otherwise let a user insert a
--       self-"approved" row directly.
--    c) The claim-completeness rule applies to EVERY role, including
--       service_role, because /api/admin/payments/approve performs its UPDATE
--       through the service-role client. Exempting service_role there would
--       make the guard a no-op for the exact path it protects.
--    d) Only the INSERT-status rule is exempt for privileged roles
--       (service_role / postgres / supabase_admin), mirroring
--       protect_profile_sensitive_columns() from migration 20260823000002.
--
-- OPERATIONAL NOTE: pending payments created BEFORE this migration lack the
-- claim fields, so they cannot be approved until the user resubmits a slip
-- carrying them. Relax the UPDATE guard below if grandfathering is preferred.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS claimed_transfer_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimed_bank_account_last4 TEXT;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_claimed_bank_account_last4_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_claimed_bank_account_last4_check
  CHECK (claimed_bank_account_last4 IS NULL OR claimed_bank_account_last4 ~ '^[0-9]{4}$');

CREATE OR REPLACE FUNCTION public.guard_payment_status_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  effective_role TEXT := current_setting('role', true);
  session_role TEXT := session_user;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Privileged roles may seed non-pending rows (admin tooling / backfills);
    -- everyone else must start at 'pending'.
    IF NEW.status IS DISTINCT FROM 'pending'
       AND effective_role NOT IN ('postgres', 'service_role', 'supabase_admin')
       AND session_role NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
      RAISE EXCEPTION 'New payments must start as pending';
    END IF;
    RETURN NEW;
  END IF;

  -- TG_OP = 'UPDATE': claim completeness on transition INTO approved.
  -- Applies to ALL roles (incl. service_role) so the admin approve route
  -- cannot bypass it. Only transitions INTO approved are guarded, so
  -- historical approved rows stay valid and no grandfathering is needed.
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved'
     AND (NEW.claimed_transfer_time IS NULL OR NEW.claimed_bank_account_last4 IS NULL) THEN
    RAISE EXCEPTION
      'Payment % cannot be approved: claimed_transfer_time and claimed_bank_account_last4 are required',
      NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_payment_status_changes ON public.payments;
CREATE TRIGGER trg_guard_payment_status_changes
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_payment_status_changes();

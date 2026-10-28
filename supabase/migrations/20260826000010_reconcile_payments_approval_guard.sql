-- ============================================================================
-- Reconciliation: payments approval guard + claim-column drift repair
--
-- STATUS: DRAFT FOR REVIEW — NOT APPLIED ANYWHERE. Pending owner approval
--         (VERIFY-2) after PGlite rehearsal against a live-shaped baseline.
--
-- PRODUCTION DRIFT AUDITED 2026-08-26 (read-only REST/OpenAPI probes):
--   * claimed_transfer_time       timestamptz  -> present live, matches spec
--   * claimed_bank_account_last4  varchar      -> present live, but typed
--     `character varying`; THIS migration spec'd TEXT  -> normalized below
--   * guard_payment_status_changes() + trg_guard_payment_status_changes
--                                              -> CONFIRMED ABSENT on live
--     (function absent from PostgREST RPC surface while 13 sibling public
--      functions are exposed; a trigger cannot exist without its function)
--   * Whether a claim-format CHECK constraint exists live is UNVERIFIED via
--     REST -> handled deterministically below (DROP IF EXISTS + ADD).
--
-- DESIGN CHOICE — normalize type to TEXT vs. teach the guard to accept
-- varchar:
--   CHOSEN: ALTER COLUMN claimed_bank_account_last4 TYPE text (first),
--   then define the guard/constraint exactly as originally specified.
--   WHY: (a) closes the drift instead of enshrining it — future
--   `supabase db pull/diff/push` cycles stop seeing divergence; (b) risk is
--   negligible: varchar->text is a binary-coercible change that can never
--   truncate or lose data (no length limit involved), dependent constraints
--   rebuild automatically, and the live table currently holds 3 rows
--   (exclusive-lock window is effectively zero);
--   (c) behavioural difference between unbounded varchar and text is nil,
--   so the guard's IS-NULL/format logic is unchanged.
--
-- IDEMPOTENCY: safe to run repeatedly (DROP-then-CREATE semantics
-- throughout, CREATE OR REPLACE function, ADD COLUMN IF NOT EXISTS up top
-- is intentionally redundant belt-and-braces for edge environments).
-- ============================================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS claimed_transfer_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimed_bank_account_last4 TEXT;

-- Normalize the drifted column type (varchar -> text; see DESIGN CHO above).
ALTER TABLE public.payments
  ALTER COLUMN claimed_bank_account_last4 TYPE text;

-- Claim-format constraint, made deterministic/idempotent via DROP-first.
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

-- ============================================================================
-- SECTION B — DOCUMENTATION PARITY: sender_last4 / transferred_at
--   (per owner instruction: capture as legitimate existing columns going
--    forward, purely for version-control parity — see audit trail)
--
-- FACTS (live audit 2026-08-26):
--   * Both columns EXIST on production: sender_last4 varchar, transferred_at
--     timestamptz. Neither appears in ANY tracked migration file, and neither
--     is referenced anywhere under src/** (full-repo sweep) — i.e. app-inert.
--
-- ZERO-CHANGE GUARANTEE: on production these ADD COLUMN IF NOT EXISTS
-- statements are strict no-ops (columns already exist); nothing is typed,
-- re-typed, indexed, validated or otherwise altered. Their ONLY effect is on
-- EMPTY environments replaying migrations from scratch, where they materialize
-- identical definitions so those environments converge to the live shape.
-- If the owner prefers truly comment-only parity, delete Section B's ALTERs
-- and keep the COMMENTs — flagged as an alternative at review time.
-- ============================================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS sender_last4 character varying,
  ADD COLUMN IF NOT EXISTS transferred_at timestamptz;

COMMENT ON COLUMN public.payments.sender_last4 IS
  '[legacy/live-only] Last-4 digits of the payer''s bank account, captured by an
earlier ad-hoc (pre-version-control) deployment step whose exact origin is under
reconstruction. NOT read/written by current src/. Documented 2026-08-26 by
migration 20260826000010. Managed-by: none (do not drop without owner sign-off).';

COMMENT ON COLUMN public.payments.transferred_at IS
  '[legacy/live-only] Timestamp claimed/computed for the payer''s transfer, from
the same ad-hoc origin as sender_last4. NOT read/written by current src/.
Documented 2026-08-26 by migration 20260826000010. Managed-by: none (do not
drop without owner sign-off).';

-- ============================================================================
-- ROLLBACK (explicit; run manually ONLY if this migration must be reverted)
-- ----------------------------------------------------------------------------
-- DROP TRIGGER IF EXISTS trg_guard_payment_status_changes ON public.payments;
-- DROP FUNCTION IF EXISTS public.guard_payment_status_changes();
-- ALTER TABLE public.payments
--   DROP CONSTRAINT IF EXISTS payments_claimed_bank_account_last4_check;
-- -- Data-preserving type revert back to the observed drifted state:
-- ALTER TABLE public.payments
--   ALTER COLUMN claimed_bank_account_last4 TYPE character varying;
-- -- Section B reversal: on LIVE there is nothing to reverse (both statements
-- -- were no-ops); on freshly-provisioned environments only, optionally:
-- -- ALTER TABLE public.payments
-- --   DROP COLUMN IF EXISTS sender_last4, DROP COLUMN IF EXISTS transferred_at;
-- -- (Destructive on any environment holding legacy data — hence commented out;
-- --  run manually only after owner sign-off.)
-- NOTE: rolling back re-exposes approvals to having NO database-level guard.
-- ============================================================================

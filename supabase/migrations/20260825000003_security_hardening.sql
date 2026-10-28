-- Security hardening: close self-mint hole + atomic approve transaction.
--
-- Runs against an *already migrated* production DB (all referenced objects
-- already exist there). On a fresh `supabase db reset` it must sort AFTER
-- migrations 20250825000001 (admin_action_logs), 20250825000002 (claim fields)
-- and 20250820000014 (apply_approved_add_on), so the leading timestamp is
-- intentionally 20260825000003 (NOT 20250820000006, which is taken by
-- add_card_features.sql and would sort too early).

-- 1) Close the CRITICAL self-mint hole: only the service-role (admin routes)
--    may credit accounts. Postgres grants EXECUTE to PUBLIC on every function
--    by default, so PUBLIC must be revoked too or anon/authenticated keep
--    access through it even after their direct grants are removed.
REVOKE EXECUTE ON FUNCTION public.increment_credits(UUID, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_credits(UUID, NUMERIC) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.increment_credits(UUID, NUMERIC) TO service_role;

-- 2) Atomic approve: status flip + credit/tier grant + add-on + audit log in 1 tx.
--    Mirrors the previous /api/admin/payments/approve route logic exactly so
--    runtime behaviour is unchanged (incl. the pro-package absolute-quota rule
--    and custom_url_quota being incremented by `permanent_add`).
CREATE OR REPLACE FUNCTION public.approve_payment_transaction(
  p_payment_id UUID,
  p_admin_id   UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.payments%ROWTYPE;
  cur INTEGER;
  cur_premium INTEGER;
  cur_custom INTEGER;
  pkg_tier TEXT;
  permanent_add INTEGER;
  custom_url_add INTEGER;
  premium_add INTEGER;
  is_package BOOLEAN;
  is_plain_topup BOOLEAN;
  is_addon BOOLEAN;
BEGIN
  -- Load the pending payment and lock it.
  SELECT *
    INTO p
  FROM public.payments
   WHERE id = p_payment_id
     AND status = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % does not exist or is not pending', p_payment_id
    USING ERRCODE = 'P0002';
  END IF;

  -- The BEFORE UPDATE trigger (trg_guard_payment_status_changes) guarantees
  -- claimed_transfer_time + claimed_bank_account_last4 are present here.
  UPDATE public.payments
     SET status = 'approved',
         approved_at = NOW()
   WHERE id = p_payment_id;

  is_package     := p.package_type IS NOT NULL;
  is_plain_topup := p.payment_type = 'topup' AND NOT is_package;
  is_addon       := p.payment_type IN ('add_on_custom_url', 'add_on_permanent');

  -- Add credits for plain top-ups.
  IF is_plain_topup THEN
    PERFORM public.increment_credits(p.user_id, p.amount);
  END IF;

  -- Tier + quota upgrade for package payments.
  IF is_package THEN
    SELECT permanent_quota, premium_quota, custom_url_quota
      INTO cur, cur_premium, cur_custom
      FROM public.profiles
     WHERE id = p.user_id
     FOR UPDATE;

    CASE p.package_type
      WHEN 'starter_69' THEN pkg_tier := 'starter'; permanent_add := 3; custom_url_add := 3; premium_add := 1;
      WHEN 'value_119'  THEN pkg_tier := 'value';  permanent_add := 8; custom_url_add := 8; premium_add := 3;
      WHEN 'pro_199'    THEN pkg_tier := 'pro';    permanent_add := 2147483647; premium_add := 10;
      ELSE RAISE EXCEPTION 'Invalid package_type %', p.package_type;
    END CASE;

    IF pkg_tier = 'pro' THEN
      UPDATE public.profiles
         SET tier = 'pro',
             permanent_quota = 2147483647,
             custom_url_quota = 2147483647,
             premium_quota = cur_premium + premium_add
       WHERE id = p.user_id;
    ELSE
      UPDATE public.profiles
         SET tier = pkg_tier,
             permanent_quota = cur + permanent_add,
             custom_url_quota = cur_custom + permanent_add,   -- mirrors existing route
             premium_quota = cur_premium + premium_add
       WHERE id = p.user_id;
    END IF;
  END IF;

  -- Apply add-on entitlements (permanent-url / permanent-storage).
  IF is_addon THEN
    PERFORM public.apply_approved_add_on(p_payment_id);
  END IF;

  -- Immutable audit row.
  INSERT INTO public.admin_action_logs
       (admin_id, action, payment_id, payment_user_id, amount, reason)
  VALUES (p_admin_id, 'payment_approved', p.id, p.user_id, p.amount, NULL);

  RETURN json_build_object('success', TRUE, 'amount', p.amount);
EXCEPTION
  WHEN OTHERS THEN
    -- Let the whole transaction (status flip included) roll back atomically.
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payment_transaction(UUID, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.approve_payment_transaction(UUID, UUID) TO service_role;
NOTIFY pgrst, 'reload schema';

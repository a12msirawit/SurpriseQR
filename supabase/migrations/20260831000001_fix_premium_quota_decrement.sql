-- ============================================================================
-- Fix: premium_quota was not decremented after card creation
--
-- Root cause: computeAndApplyCharges skipped the quota-decrement branch for
-- pro/vip/god tiers purely by tier name, so an explicit "use quota" selection
-- (use_premium_quota=true) never touched `premium_quota`; it stayed unchanged
-- while credits were still deducted for storage / custom URL costs.
--
-- Only tiers with a genuinely UNLIMITED premium allowance (vip -> Infinity in
-- tierRules) should skip consuming their purchased/cumulative quota balance.
-- Pro (6) and God (10) have finite allowances and must decrement.
--
-- This migration adds a service-role SECURITY DEFINER RPC that consumes one
-- cumulative quota slot atomically and never lets the balance go negative:
--     premium_quota = GREATEST(0, premium_quota - 1)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.decrement_profile_quota(
  p_user_id UUID,
  p_quota TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  -- Whitelist the cumulative quota columns; dynamic SQL must never touch others.
  IF p_quota NOT IN ('premium_quota', 'permanent_quota', 'custom_url_quota') THEN
    RETURN FALSE;
  END IF;

  -- Consume exactly one slot. The `quota > 0` guard makes the UPDATE a no-op
  -- when the balance is already empty (the caller then bills cash), and
  -- GREATEST keeps the balance non-negative under any concurrency.
  EXECUTE format(
    'UPDATE public.profiles
        SET %I = GREATEST(0, %I - 1)
      WHERE id = $1
        AND %I > 0',
    p_quota, p_quota, p_quota
  ) USING p_user_id;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN COALESCE(updated_rows, 0) > 0;
END;
$$;

-- Financial mutations on public.profiles are service_role-only by design
-- (migration 20260823000005); elevated writes come from the admin client.
REVOKE ALL ON FUNCTION public.decrement_profile_quota(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_profile_quota(UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- 20260827000004 — Fix payment approval + slips bucket configuration & RLS
--
-- SECTION A — storage bucket `slips` configuration
--   20260823000004 flipped `slips` to PRIVATE, but the application's data
--   model stores getPublicUrl() results in payments.slip_url and the admin
--   approval screens render them with plain <img src>. On a private bucket
--   the /object/public/... endpoint returns 403, so admins could no longer
--   view payment slips and the approval workflow was effectively broken.
--   Restore the public-read configuration the app is built around and re-assert
--   the size/mime limits. (Follow-up, out of scope here: move to signed-URL
--   serving so the bucket can go back to private.)
--
-- SECTION B — slips RLS policies
--   Deterministically re-create the owner-scoped policies (DROP IF EXISTS +
--   CREATE) so slip uploads/upserts from storage-client.ts / storage-server.ts
--   keep working and owners/admins keep storage-API-level read access.
--
-- SECTION C — approve_payment_transaction (DROP + re-create)
--   See the section header below for the full fix list.
--
-- IDEMPOTENCY: bucket upsert, DROP-then-CREATE policies, DROP FUNCTION IF
-- EXISTS + CREATE OR REPLACE. Safe on prod and on a fresh `supabase db reset`.
-- ============================================================================

-- ============================================================================
-- SECTION A — slips bucket configuration
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'slips',
  'slips',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- SECTION B — slips RLS policies (owner-scoped writes, owner/admin reads)
-- ============================================================================
DROP POLICY IF EXISTS "Users read own payment slips" ON storage.objects;
CREATE POLICY "Users read own payment slips"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'slips'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Users upload own payment slips" ON storage.objects;
CREATE POLICY "Users upload own payment slips"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'slips'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own payment slips" ON storage.objects;
CREATE POLICY "Users update own payment slips"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'slips'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'slips'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own payment slips" ON storage.objects;
CREATE POLICY "Users delete own payment slips"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'slips'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Admins manage all payment slips" ON storage.objects;
CREATE POLICY "Admins manage all payment slips"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'slips'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'slips'
    AND public.is_admin()
  );

-- ============================================================================
-- SECTION C — approve_payment_transaction (single atomic approval grant)
--
--   1) BUGFIX (plain top-ups): payments.amount is NUMERIC(10,2) but the only
--      increment_credits overload since 20260826000004 is (UUID, INTEGER)
--      (the numeric overload was dropped). The uncast call
--      increment_credits(p.user_id, p.amount) no longer resolves
--      ("function increment_credits(uuid, numeric) does not exist") and
--      aborted the whole approval transaction. Cast explicitly.
--   2) BUGFIX (packages — Pro Pack): approving a package never granted the
--      package duration (profiles.quota_expires_at) and it overwrote the tier
--      unconditionally (a vip could be DOWNGRADED to starter). Mirror
--      purchase_package_atomic: rank-safe tier upgrade, quota adds clamped
--      with LEAST(...), and a 30-day package duration — extended by another
--      30 days while a previous window is still active. pro_199 grants
--      unlimited permanent storage + custom URLs and +10 premium template
--      credits (premium_quota).
--   3) Explicit claim-completeness guard (belt & braces — the guard trigger
--      from 20260826000010 is a draft and may not exist live) so the admin
--      route's 400 mapping for missing claims keeps working.
--   4) Enriched JSON result so the admin UI can display the updated profile
--      (credits / tier / quotas / package duration) right after approval.
-- ============================================================================

-- DROP first (per fix spec): CREATE OR REPLACE cannot change a mismatching
-- overload/return shape, and drifted duplicates of this signature must go.
DROP FUNCTION IF EXISTS public.approve_payment_transaction(UUID, UUID);

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
  prof public.profiles%ROWTYPE;
  pkg_tier TEXT;
  permanent_add BIGINT;
  custom_url_add BIGINT;
  premium_add INTEGER;
  is_package BOOLEAN;
  is_plain_topup BOOLEAN;
  is_addon BOOLEAN;
  current_tier_rank INTEGER;
  package_tier_rank INTEGER;
  new_tier TEXT;
  new_expiry TIMESTAMPTZ;
  out_credits NUMERIC;
  out_tier TEXT;
  out_premium INTEGER;
  out_permanent INTEGER;
  out_custom INTEGER;
  out_expiry TIMESTAMPTZ;
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

  -- Claim completeness (belt & braces; mirrors guard_payment_status_changes,
  -- which may not exist live). The approve route maps these messages to a 400.
  IF p.claimed_transfer_time IS NULL OR p.claimed_bank_account_last4 IS NULL THEN
    RAISE EXCEPTION 'Payment % cannot be approved: claimed_transfer_time and claimed_bank_account_last4 are required',
      p_payment_id;
  END IF;

  UPDATE public.payments
     SET status = 'approved',
         approved_at = NOW()
   WHERE id = p_payment_id;

  is_package     := p.package_type IS NOT NULL;
  is_plain_topup := p.payment_type = 'topup' AND NOT is_package;
  is_addon       := p.payment_type IN ('add_on_custom_url', 'add_on_permanent');

  -- Add credits for plain top-ups.
  -- FIX 1: payments.amount is NUMERIC(10,2); the only increment_credits
  -- overload granted since 20260826000004 is (UUID, INTEGER). Cast explicitly
  -- so the call resolves and the wallet top-up actually lands.
  IF is_plain_topup THEN
    PERFORM public.increment_credits(p.user_id, ROUND(p.amount)::INTEGER);
  END IF;

  -- Tier + quota upgrade for package payments.
  IF is_package THEN
    SELECT *
      INTO prof
    FROM public.profiles
     WHERE id = p.user_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Profile % does not exist', p.user_id
      USING ERRCODE = 'P0002';
    END IF;

    CASE p.package_type
      WHEN 'starter_69' THEN
        pkg_tier      := 'starter';
        permanent_add := 3;
        custom_url_add := 3;
        premium_add   := 1;
      WHEN 'value_119' THEN
        pkg_tier      := 'value';
        permanent_add := 8;
        custom_url_add := 8;
        premium_add   := 3;
      WHEN 'pro_199' THEN
        pkg_tier      := 'pro';
        permanent_add := 2147483647;
        custom_url_add := 2147483647;
        premium_add   := 10;
      ELSE
        RAISE EXCEPTION 'Invalid package_type %', p.package_type;
    END CASE;

    -- Rank-safe tier upgrade: never downgrade (e.g. vip must stay vip).
    current_tier_rank := CASE prof.tier
      WHEN 'starter' THEN 1
      WHEN 'value'   THEN 2
      WHEN 'pro'     THEN 3
      WHEN 'vip'     THEN 4
      ELSE 0
    END;
    package_tier_rank := CASE pkg_tier
      WHEN 'starter' THEN 1
      WHEN 'value'   THEN 2
      WHEN 'pro'     THEN 3
      ELSE 0
    END;
    new_tier := CASE
      WHEN package_tier_rank > current_tier_rank THEN pkg_tier
      ELSE prof.tier
    END;

    -- FIX 2: package duration. Extend an active window by 30 days, otherwise
    -- start a fresh 30-day window (mirrors purchase_package_atomic).
    IF prof.quota_expires_at IS NOT NULL AND prof.quota_expires_at > NOW() THEN
      new_expiry := prof.quota_expires_at + INTERVAL '30 days';
    ELSE
      new_expiry := NOW() + INTERVAL '30 days';
    END IF;

    UPDATE public.profiles
       SET tier = new_tier,
           permanent_quota = LEAST(2147483647::BIGINT, prof.permanent_quota::BIGINT + permanent_add::BIGINT)::INTEGER,
           custom_url_quota = LEAST(2147483647::BIGINT, prof.custom_url_quota::BIGINT + custom_url_add::BIGINT)::INTEGER,
           premium_quota = LEAST(2147483647::BIGINT, prof.premium_quota::BIGINT + premium_add::BIGINT)::INTEGER,
           quota_expires_at = new_expiry
     WHERE id = p.user_id;
  END IF;

  -- Apply add-on entitlements (permanent-url / permanent-storage).
  IF is_addon THEN
    PERFORM public.apply_approved_add_on(p_payment_id);
  END IF;

  -- Immutable audit row.
  INSERT INTO public.admin_action_logs
       (admin_id, action, payment_id, payment_user_id, amount, reason)
  VALUES (p_admin_id, 'payment_approved', p.id, p.user_id, p.amount, NULL);

  -- Enriched snapshot of the grantee's profile so the admin UI can display the
  -- updated credits/quotas/package duration straight from this transaction.
  SELECT credits, tier, premium_quota, permanent_quota, custom_url_quota, quota_expires_at
    INTO out_credits, out_tier, out_premium, out_permanent, out_custom, out_expiry
  FROM public.profiles
   WHERE id = p.user_id;

  RETURN json_build_object(
    'success', TRUE,
    'amount', p.amount,
    'payment_type', p.payment_type,
    'package_type', p.package_type,
    'credits', out_credits,
    'tier', out_tier,
    'premium_quota', out_premium,
    'permanent_quota', out_permanent,
    'custom_url_quota', out_custom,
    'quota_expires_at', out_expiry
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Let the whole transaction (status flip included) roll back atomically.
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payment_transaction(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_payment_transaction(UUID, UUID) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.approve_payment_transaction(UUID, UUID) TO service_role;
NOTIFY pgrst, 'reload schema';
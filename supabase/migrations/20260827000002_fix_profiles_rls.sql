-- ============================================================================
-- fix_profiles_rls_card_creation
-- Context for "Permission denied for table profiles" during card creation.
--
-- REAL ROOT CAUSE (verified against this repo's migration history):
--   1) 20260823000005 REVOKE UPDATE ON public.profiles FROM authenticated,
--      re-granting column-level UPDATE only for (display_name, avatar_url).
--   2) 20260825000003 / 20260826000004 revoke increment_credits() EXECUTE
--      from anon/authenticated/PUBLIC and grant it solely to service_role.
--   Card creation was still performing credit/quota mutations with the
--   user-scoped (authenticated) client, so Postgres raised 42501 before RLS
--   was ever consulted. THE FIX IS IN APPLICATION CODE: those mutations now
--   execute through the service-role admin client
--   (see src/lib/cards/create-card-core.ts and api/cards/create/route.ts).
--
-- NOTE on the policies below (kept idempotent per task spec):
--   * "Users can view own profile" is additive/harmless if absent.
--   * "Users can update own profile" ALREADY EXISTS in hardened form since
--     migration 20260823000002 (with trigger trg_protect_profile_sensitive_
--     _columns). The IF NOT EXISTS guard intentionally leaves that stricter,
--     existing definition untouched. RLS policies never grant table/column
--     privileges, so re-creating them would neither fix nor weaken anything.
-- ============================================================================

-- Enable RLS on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to read their own profile
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'profiles'
          AND policyname = 'Users can read own profile'
    ) THEN
        CREATE POLICY "Users can read own profile"
        ON public.profiles FOR SELECT
        TO authenticated
        USING (auth.uid() = id);
    END IF;
END $$;

-- Policy: Allow users to update their own profile
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'profiles'
          AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile"
        ON public.profiles FOR UPDATE
        TO authenticated
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    END IF;
END $$;
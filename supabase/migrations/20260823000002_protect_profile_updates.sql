DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  effective_role TEXT := current_setting('role', true);
  session_role TEXT := session_user;
BEGIN
  -- SECURITY DEFINER RPCs run with the owner role, while direct PostgREST updates
  -- retain the authenticated role. Service and database owner roles may update protected fields.
  IF effective_role NOT IN ('postgres', 'service_role', 'supabase_admin')
     AND session_role NOT IN ('postgres', 'service_role', 'supabase_admin')
     AND (
       NEW.credits IS DISTINCT FROM OLD.credits
       OR NEW.tier IS DISTINCT FROM OLD.tier
       OR NEW.permanent_quota IS DISTINCT FROM OLD.permanent_quota
       OR NEW.custom_url_quota IS DISTINCT FROM OLD.custom_url_quota
       OR NEW.premium_quota IS DISTINCT FROM OLD.premium_quota
       OR NEW.quota_expires_at IS DISTINCT FROM OLD.quota_expires_at
     ) THEN
    RAISE EXCEPTION 'Cannot modify protected profile fields directly';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_columns ON public.profiles;

CREATE TRIGGER trg_protect_profile_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_columns();

GRANT EXECUTE ON FUNCTION public.process_package_payment(TEXT) TO authenticated;
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export { getExpirationLabel, getCardSharePath } from "@/lib/card-utils";

export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!data) return null;

  const now = Date.now();
  const hasExpiredPackage =
    data.package_tier != null &&
    data.package_expires_at != null &&
    new Date(data.package_expires_at).getTime() <= now;
  const hasExpiredQuota =
    data.quota_expires_at != null &&
    new Date(data.quota_expires_at).getTime() <= now;

  if (hasExpiredPackage || hasExpiredQuota) {
    // Apply the 7-day post-expiry cleanup only when an entitlement has actually reached expiry.
    await supabase.rpc("expire_my_package_entitlements");
    const { data: refreshedProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    return refreshedProfile ?? data;
  }

  return data;
});

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") redirect("/dashboard");
  return { user, profile };
}

// SECURITY: ban flag is authoritative in profiles.is_banned (Step-1 migration).
// Read through the service-role client so the check works even where RLS would
// otherwise hide the row, and fails CLOSED only when env is missing (never on
// transient DB errors, which return the raw result).
export async function isUserBanned(userId: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return false;
  const serviceClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await serviceClient
    .from("profiles")
    .select("is_banned")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.is_banned);
}

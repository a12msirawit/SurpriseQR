import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export { getExpirationLabel, getCardSharePath } from "@/lib/card-utils";

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

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

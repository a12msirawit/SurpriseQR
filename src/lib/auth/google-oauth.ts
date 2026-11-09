import { createClient } from "@/lib/supabase/client";

/** Start Google OAuth only after Supabase returns a valid provider URL. */
export async function startGoogleOAuth() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL("/auth/callback", window.location.origin).toString(),
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error("Google OAuth did not return an authorization URL");

  window.location.assign(data.url);
}

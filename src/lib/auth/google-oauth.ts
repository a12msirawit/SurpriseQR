import { createClient } from "@/lib/supabase/client";

/** Start Google OAuth only after Supabase returns a valid provider URL. */
export async function startGoogleOAuth(nextPath?: string) {
  const supabase = createClient();
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || "https://surprise-qr.vercel.app";

  const redirectUrl = new URL("/auth/callback", origin);
  if (nextPath) {
    redirectUrl.searchParams.set("next", nextPath);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl.toString(),
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error("Google OAuth did not return an authorization URL");

  window.location.assign(data.url);
}

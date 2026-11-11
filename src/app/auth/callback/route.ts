import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");

  // Determine effective origin dynamically (supports reverse proxies like Vercel)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const isLocalEnv = process.env.NODE_ENV === "development";

  const effectiveOrigin = isLocalEnv
    ? origin
    : forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : origin && !origin.includes("localhost")
        ? origin
        : process.env.NEXT_PUBLIC_SITE_URL || "https://surprise-qr.vercel.app";

  const failureUrl = new URL("/login?error=auth_failed", effectiveOrigin);

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("OAuth callback - exchange code error:", error.message);
        return NextResponse.redirect(failureUrl);
      }

      let destination = new URL("/dashboard", effectiveOrigin);
      if (requestedNext?.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.includes("\\")) {
        try {
          const candidate = new URL(requestedNext, effectiveOrigin);
          if (candidate.origin === effectiveOrigin) destination = candidate;
        } catch {
          // Keep the safe dashboard fallback for malformed redirect paths.
        }
      }

      return NextResponse.redirect(destination);
    } catch (error) {
      console.error("OAuth callback failed:", error);
      return NextResponse.redirect(failureUrl);
    }
  }

  return NextResponse.redirect(failureUrl);
}

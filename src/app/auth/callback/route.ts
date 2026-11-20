import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
      let destination = new URL("/dashboard", effectiveOrigin);
      if (requestedNext?.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.includes("\\")) {
        try {
          const candidate = new URL(requestedNext, effectiveOrigin);
          if (candidate.origin === effectiveOrigin) destination = candidate;
        } catch {
          // Keep the safe dashboard fallback for malformed redirect paths.
        }
      }

      const response = NextResponse.redirect(destination);
      response.headers.set("Cache-Control", "no-store");

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(
              cookiesToSet: {
                name: string;
                value: string;
                options: CookieOptions;
              }[]
            ) {
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options);
              });
            },
          },
        }
      );

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("OAuth callback - exchange code error:", error.message);
        return NextResponse.redirect(failureUrl);
      }

      return response;
    } catch (error) {
      console.error("OAuth callback failed:", error);
      return NextResponse.redirect(failureUrl);
    }
  }

  return NextResponse.redirect(failureUrl);
}

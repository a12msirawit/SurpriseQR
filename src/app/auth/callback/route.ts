import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  const failureUrl = new URL("/login?error=auth_failed", origin);

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("OAuth callback - exchange code error:", error.message);
        return NextResponse.redirect(failureUrl);
      }

      let destination = new URL("/dashboard", origin);
      if (requestedNext?.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.includes("\\")) {
        try {
          const candidate = new URL(requestedNext, origin);
          if (candidate.origin === origin) destination = candidate;
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

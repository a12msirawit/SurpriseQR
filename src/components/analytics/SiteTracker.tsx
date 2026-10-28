"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SESSION_STORAGE_KEY = "visitor_session_id";

/**
 * Returns the visitor session id for this browser tab, creating one on the
 * first visit of the session. Stored in sessionStorage so navigating between
 * pages reuses the SAME id (deduplication) while a brand-new tab/session
 * naturally starts fresh.
 */
function getOrCreateVisitorSessionId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    let sessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (!sessionId) {
      sessionId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;

      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }

    return sessionId;
  } catch {
    // sessionStorage unavailable (private mode / blocked storage) — skip silently.
    return null;
  }
}

/**
 * Global website-traffic tracker mounted once in the Root Layout.
 *
 * - Logs the first visit of a browser session AND every subsequent route
 *   change (Home, Dashboard, Cards, Create, Login, ...) — GLOBAL TRACKING.
 * - All rows share the same session token, so the admin dashboard can derive
 *   unique visitors via COUNT(DISTINCT session_id) — DEDUPLICATION.
 * - Fire-and-forget: never blocks rendering and never throws into the UI.
 */
export default function SiteTracker() {
  const pathname = usePathname();
  const lastLoggedRef = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    if (!pathname) return;

    // Guard against duplicate fires for the same path in quick succession
    // (e.g. React StrictMode double-invoking effects in development).
    const now = Date.now();
    const last = lastLoggedRef.current;
    if (last && last.path === pathname && now - last.at < 2000) return;

    const sessionId = getOrCreateVisitorSessionId();
    if (!sessionId) return;

    lastLoggedRef.current = { path: pathname, at: now };

    try {
      const supabase = createClient();

      supabase
        .rpc("log_site_visit", { p_session_id: sessionId, p_path: pathname })
        .then(({ error }) => {
          if (error) {
            console.warn("[SiteTracker] Failed to log site visit:", error.message);
          }
        });
    } catch (err) {
      console.warn("[SiteTracker] Unable to initialize analytics client:", err);
    }
  }, [pathname]);

  return null;
}
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUserBanned } from "@/lib/auth";
import { PRICING_PACKAGES } from "@/lib/packages";

/**
 * Alias -> canonical package code, derived from the central catalogue so the
 * API validation and the RPC contract can never drift apart. The RPC
 * (`process_package_payment`) is always called with the canonical
 * `payments.package_type` value (`starter_69` / `value_119` / `pro_199` /
 * `god_269`), never with a legacy alias (`69`, `package_69`, short tier
 * names, etc.) — older RPC versions only accepted a subset of aliases, which
 * surfaced as `Invalid package` (P0001).
 */
const CANONICAL_PACKAGE_CODES: Record<string, string> = Object.fromEntries(
  PRICING_PACKAGES.flatMap((pkg) => [
    [pkg.id, pkg.id],
    [pkg.tierKey, pkg.id],
    [String(pkg.price), pkg.id],
    [`package_${pkg.price}`, pkg.id],
  ]),
);

/**
 * Non-production diagnostics: attach the underlying PostgREST error so a 500
 * instantly reveals its true cause in the browser Network tab (e.g. P0001
 * "Invalid package" when the remote database has not had the God Pack /
 * stacking migrations applied yet).
 */
function devDetail(error: { code?: string | null; message?: string }):
  { code: string | null; message: string } | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  return { code: error.code ?? null, message: error.message ?? "" };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "กรุณาล็อกอินก่อนทำรายการ" }, { status: 401 });
    }
    if (await isUserBanned(user.id)) {
      return NextResponse.json({ error: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" }, { status: 403 });
    }

    const body = await req.json() as { packageId?: unknown; packageType?: unknown };
    const packageId = body.packageId ?? body.packageType;
    const packageKey = String(packageId).trim().toLowerCase();

    // Normalize every accepted alias to the canonical package code before
    // hitting the RPC (e.g. "69"/"package_69"/"starter" -> "starter_69").
    const canonicalCode = CANONICAL_PACKAGE_CODES[packageKey];

    if (!canonicalCode) {
      return NextResponse.json({ error: "ไม่พบแพ็กเกจที่ระบุ" }, { status: 404 });
    }

    const { data, error } = await supabase.rpc("process_package_payment", {
      p_package_id: canonicalCode,
    });

    if (error) {
      console.error("Package payment RPC error:", error);
      if (error.message.includes("Insufficient credits")) {
        return NextResponse.json({ error: "You do not have enough credits for this package." }, { status: 402 });
      }
      if (error.message.includes("Profile not found")) {
        return NextResponse.json({ error: "User profile could not be found." }, { status: 404 });
      }
      if (error.message.includes("Invalid package")) {
        // P0001 from an RPC version that predates the God Pack / stacking
        // migrations — the remote database needs 20260828000001 +
        // 20260828000002 applied (see docs/apply_to_remote__god_pack_and_stacking.sql).
        return NextResponse.json(
          {
            error: "แพ็กเกจนี้ยังไม่พร้อมใช้งาน — ฐานข้อมูลยังไม่รองรับ กรุณาอัปเดต migration ก่อน",
            detail: devDetail(error),
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: "Payment processing failed. Please try again.", detail: devDetail(error) },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      profile: data,
    });
  } catch (error) {
    console.error("Package payment request error:", error);
    const err = error as { code?: string; message?: string };
    return NextResponse.json(
      { error: "Payment processing failed. Please try again.", detail: devDetail(err) },
      { status: 500 },
    );
  }
}

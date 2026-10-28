import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const MODERATION_STATUSES = ["active", "hidden", "flagged"] as const;

// SECURITY FIRST: moderation status changes run through the service-role client
// only, behind requireAdmin(). Regular clients cannot set hidden/flagged.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { status } = await request.json();
    if (!MODERATION_STATUSES.includes(status)) {
      return NextResponse.json({ error: `สถานะไม่ถูกต้อง ต้องเป็น ${MODERATION_STATUSES.join(" / ")}` }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    }
    const serviceClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await serviceClient
      .from("cards")
      .update({ status })
      .eq("id", id);
    if (error) {
      console.error("Full Supabase Error:", error);
      return NextResponse.json({ error: "ไม่สามารถอัปเดตสถานะการ์ดได้ กรุณาลองใหม่" }, { status: 500 });
    }

    return NextResponse.json({ success: true, status }, { status: 200 });
  } catch (error) {
    console.error("Full Supabase Error:", error);
    return NextResponse.json({ error: "ไม่สามารถอัปเดตสถานะการ์ดได้ กรุณาลองใหม่" }, { status: 500 });
  }
}
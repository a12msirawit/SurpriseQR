import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// SECURITY FIRST: banning flips profiles.is_banned through the service-role
// client only, behind requireAdmin(). Regular clients cannot touch the column.
export async function POST(request: Request) {
  try {
    const { user: adminUser } = await requireAdmin();
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId, banned } = await request.json();
    if (typeof userId !== "string" || typeof banned !== "boolean") {
      return NextResponse.json({ error: "userId and banned are required" }, { status: 400 });
    }
    if (userId === adminUser.id) {
      return NextResponse.json({ error: "ไม่สามารถระงับบัญชีของตัวเองได้" }, { status: 400 });
    }

    const serviceClient = createAdminClient();

    const { error } = await serviceClient
      .from("profiles")
      .update({ is_banned: banned })
      .eq("id", userId);
    if (error) {
      console.error("Ban user - update error:", error.message || error);
      return NextResponse.json({ error: "ไม่สามารถอัปเดตสถานะผู้ใช้ได้ กรุณาลองใหม่" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Ban user - unexpected error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "ไม่สามารถอัปเดตสถานะผู้ใช้ได้ กรุณาลองใหม่" }, { status: 500 });
  }
}
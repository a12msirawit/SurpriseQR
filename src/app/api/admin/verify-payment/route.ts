import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  await requireAdmin();
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { payment_id, status } = body;

    if (!payment_id || !status || (status !== "approved" && status !== "rejected")) {
      return NextResponse.json(
        { error: "Invalid request. payment_id and status (approved/rejected) are required." },
        { status: 400 }
      );
    }

    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("id, user_id, status")
      .eq("id", payment_id)
      .single();

    if (fetchError || !payment) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }

    if (payment.status !== "pending") {
      return NextResponse.json({ error: "Payment is not pending." }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("payments")
      .update({ status })
      .eq("id", payment_id);

    if (updateError) {
      console.error("Payment verification update error:", updateError);
      return NextResponse.json({ error: "ไม่สามารถอัปเดตสถานะการชำระเงินได้ กรุณาลองใหม่" }, { status: 500 });
    }

    if (status === "approved") {
      // Tier grant is a financial mutation on public.profiles; the
      // authenticated role has no UPDATE grant on that table by design
      // (migration 20260823000005), so it runs through the service-role
      // client. Safe bypass: requireAdmin() has verified the caller and
      // the target user_id comes from the fetched payment row, never
      // from raw request input.
      const profileAdminDb = createAdminClient();
      const { error: profileError } = await profileAdminDb
        .from("profiles")
        .update({ tier: "pro" })
        .eq("id", payment.user_id);

      if (profileError) {
        console.error("Payment verification profile error:", profileError);
        return NextResponse.json({ error: "ไม่สามารถอัปเดตโปรไฟล์ผู้ใช้ได้ กรุณาลองใหม่" }, { status: 500 });
      }

      const { error: cardsError } = await supabase
        .from("cards")
        .update({ expiry_date: null })
        .eq("user_id", payment.user_id);

      if (cardsError) {
        console.error("Payment verification cards error:", cardsError);
        return NextResponse.json({ error: "ไม่สามารถอัปเดตข้อมูลการ์ดได้ กรุณาลองใหม่" }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Payment ${status} successfully`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

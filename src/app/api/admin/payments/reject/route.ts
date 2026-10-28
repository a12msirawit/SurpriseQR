import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { user: adminUser } = await requireAdmin();
  const supabase = await createAdminClient();
  const { paymentId, reason } = await request.json();
  if (!paymentId) return NextResponse.json({ error: "paymentId is required" }, { status: 400 });

  const rejectReason = typeof reason === "string" ? reason.trim() || null : null;

  // Snapshot the affected payment BEFORE mutating it, so the audit row can be
  // written even if the payment is later cleaned up (matching the audit-log
  // design in admin_action_logs).
  const { data: payment } = await supabase
    .from("payments")
    .select("id, user_id, amount")
    .eq("id", paymentId)
    .eq("status", "pending")
    .maybeSingle();

  const { error } = await supabase
    .from("payments")
    .update({ status: "rejected", reject_reason: rejectReason })
    .eq("id", paymentId)
    .eq("status", "pending");
  if (error) {
    console.error("Payment rejection error:", error);
    return NextResponse.json({ error: "ไม่สามารถปฏิเสธรายการชำระเงินได้ กรุณาลองใหม่" }, { status: 500 });
  }
  if (!payment) {
    return NextResponse.json({ error: "รายการชำระเงินไม่พบหรือไม่ใช่สถานะรออนุมัติ" }, { status: 404 });
  }

  // Append-only audit row (table is INSERT-by-service-role only). Uses the real
  // admin_action_logs columns (action/payment_id/payment_user_id/amount) which
  // the previous code got wrong (action_type/target_type/target_id/details).
  const { error: auditError } = await supabase.from("admin_action_logs").insert({
    admin_id: adminUser.id,
    action: "payment_rejected",
    payment_id: payment.id,
    payment_user_id: payment.user_id,
    amount: payment.amount,
    reason: rejectReason,
  });
  if (auditError) {
    console.error("Failed to insert audit log for payment rejection:", auditError);
  }

  return NextResponse.json({ success: true });
}

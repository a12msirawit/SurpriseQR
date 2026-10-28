import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    // SEC-1: auth-first. requireAdmin() resolves the real admin from the
    // session cookie; we use that identity (NOT the service-role client's
    // auth, which has no session) for the RPC's p_admin_id audit snapshot.
    const { user: adminUser } = await requireAdmin();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { paymentId } = await request.json();
    if (!paymentId) return NextResponse.json({ error: "paymentId is required" }, { status: 400 });

    // Execute the entire approve flow atomically in the DB.
    const { data: rpcData, error: rpcError } = await supabase.rpc("approve_payment_transaction", {
      p_payment_id: paymentId,
      p_admin_id: adminUser.id,
    });
    if (rpcError) {
      console.error("Full Supabase Error:", rpcError);
      let status = 500;
      let message = "ไม่สามารถอนุมัติรายการชำระเงินได้ กรุณาลองใหม่";
      const msg = rpcError.message;
      if (msg?.includes("does not exist or is not pending")) {
        status = 409;
        message = "Payment is not pending";
      } else if (msg?.includes("claimed_transfer_time") || msg?.includes("claimed_bank_account_last4")) {
        status = 400;
        message = "ต้องระบุเวลาและบัญชีที่ใช้โอนเงินก่อนอนุมัติ";
      }
      return NextResponse.json({ error: message }, { status });
    }

    const result = (rpcData ?? {}) as {
      amount?: number;
      credits?: number;
      tier?: string;
      premium_quota?: number;
      permanent_quota?: number;
      custom_url_quota?: number;
      quota_expires_at?: string | null;
    };

    // NOTE: The audit row is written atomically by approve_payment_transaction
    // (migration 20260825000003 inserts into admin_action_logs with the exact
    // columns admin_id/action/payment_id/payment_user_id/amount). Duplicating it
    // here previously used non-existent columns (action_type/target_type/...)
    // and failed silently — removed to avoid a second, broken write path.

    // The RPC (20260827000004) returns the grantee's updated profile snapshot
    // so the admin UI can display the resulting balance / tier / quotas /
    // package duration straight from the approval transaction.
    return NextResponse.json(
      {
        success: true,
        amount: Number(result.amount ?? 0),
        credits: result.credits != null ? Number(result.credits) : null,
        tier: result.tier ?? null,
        premium_quota: result.premium_quota ?? null,
        permanent_quota: result.permanent_quota ?? null,
        custom_url_quota: result.custom_url_quota ?? null,
        quota_expires_at: result.quota_expires_at ?? null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Full Supabase Error:", error);
    return NextResponse.json({ error: "ไม่สามารถอนุมัติรายการชำระเงินได้ กรุณาลองใหม่" }, { status: 500 });
  }
}

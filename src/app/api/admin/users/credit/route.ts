import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_ABS_AMOUNT = 1_000_000;

export async function POST(request: Request) {
  try {
    const { user: adminUser } = await requireAdmin();
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId, amount } = await request.json();
    const parsedAmount = Number(amount);
    if (typeof userId !== "string" || !Number.isFinite(parsedAmount) || parsedAmount === 0) {
      return NextResponse.json({ error: "userId และ amount (ไม่เป็นศูนย์) จำเป็นต้องระบุ" }, { status: 400 });
    }
    const rounded = Math.round(parsedAmount * 100) / 100;
    if (Math.abs(rounded) > MAX_ABS_AMOUNT) {
      return NextResponse.json({ error: `จำนวนเงินเกินขีดจำกัด (สูงสุด ±${MAX_ABS_AMOUNT.toLocaleString()})` }, { status: 400 });
    }

    const serviceClient = createAdminClient();

    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();
    if (profileError || !profile) {
      console.error("Credit adjustment - profile fetch error:", profileError?.message || profileError);
      return NextResponse.json({ error: "ไม่พบโปรไฟล์ผู้ใช้" }, { status: 404 });
    }

    const newCredits = Number(profile.credits) + rounded;
    if (newCredits < 0) {
      return NextResponse.json({ error: `ยอดเงินหลังปรับต้องไม่ติดลบ (ปัจจุบัน ${Number(profile.credits).toFixed(2)})` }, { status: 400 });
    }

    const { error: updateError } = await serviceClient
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", userId);
    if (updateError) {
      console.error("Credit adjustment - update error:", updateError.message || updateError);
      return NextResponse.json({ error: "ไม่สามารถปรับยอดเงินได้ กรุณาลองใหม่" }, { status: 500 });
    }

    return NextResponse.json({ success: true, credits: newCredits }, { status: 200 });
  } catch (error) {
    console.error("Credit adjustment - unexpected error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "ไม่สามารถปรับยอดเงินได้ กรุณาลองใหม่" }, { status: 500 });
  }
}
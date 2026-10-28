import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUserBanned } from "@/lib/auth";
import { PACKAGE_PRICES } from "@/lib/packages";

const MAX_SLIP_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ADD_ON_PRICE = 19;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isUserBanned(user.id)) {
    return NextResponse.json({ error: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("slip");
  const amount = Number(formData.get("amount"));
  const creditsGranted = Number(formData.get("credits_granted"));
  const paymentType = String(formData.get("payment_type") || "topup");
  const cardId = formData.get("card_id");
  const packageTypeEntry = formData.get("package_type");
  const packageType = typeof packageTypeEntry === "string" ? packageTypeEntry : null;

  // Payer claim evidence (REQUIRED): the DB-level approval guard refuses to
  // approve any payment whose claim columns are NULL, so collect them here.
  const claimedTimeRaw = formData.get("claimed_transfer_time");
  const claimedLast4Raw = formData.get("claimed_bank_account_last4");
  const claimedTime = typeof claimedTimeRaw === "string" && claimedTimeRaw !== "" ? new Date(claimedTimeRaw) : null;
  const claimedLast4 = typeof claimedLast4Raw === "string" ? claimedLast4Raw.trim() : "";
  if (!claimedTime || Number.isNaN(claimedTime.getTime())) {
    return NextResponse.json({ error: "กรุณาระบุเวลาที่โอนเงิน" }, { status: 400 });
  }
  if (claimedTime.getTime() > Date.now() + 5 * 60 * 1000) {
    return NextResponse.json({ error: "เวลาที่โอนเงินต้องไม่อยู่ในอนาคต" }, { status: 400 });
  }
  if (!/^[0-9]{4}$/.test(claimedLast4)) {
    return NextResponse.json({ error: "กรุณาระบุเลขท้ายบัญชีธนาคาร 4 หลัก" }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "กรุณาแนบสลิป" }, { status: 400 });
  }
  if (file.size > MAX_SLIP_BYTES || !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "รองรับเฉพาะ JPG, PNG, WEBP ขนาดไม่เกิน 10MB" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || (paymentType === "topup" && !packageType && creditsGranted !== amount)) {
    return NextResponse.json({ error: "ข้อมูลจำนวนเงินไม่ถูกต้อง" }, { status: 400 });
  }
  if (packageType && (!(packageType in PACKAGE_PRICES) || amount !== PACKAGE_PRICES[packageType as keyof typeof PACKAGE_PRICES] || creditsGranted !== 0)) {
    return NextResponse.json({ error: "ข้อมูลแพ็กเกจไม่ถูกต้อง" }, { status: 400 });
  }
  if (!["topup", "add_on_custom_url", "add_on_permanent"].includes(paymentType)) {
    return NextResponse.json({ error: "ประเภทการชำระเงินไม่ถูกต้อง" }, { status: 400 });
  }
  if (paymentType !== "topup" && (amount !== ADD_ON_PRICE || creditsGranted !== 0)) {
    return NextResponse.json({ error: "Add-on ต้องมีราคา 19 บาท" }, { status: 400 });
  }
  if (paymentType === "add_on_permanent" && typeof cardId !== "string") {
    return NextResponse.json({ error: "กรุณาระบุการ์ดที่ต้องการเก็บถาวร" }, { status: 400 });
  }
  if (typeof cardId === "string") {
    const { data: card } = await supabase.from("cards").select("id").eq("id", cardId).eq("user_id", user.id).maybeSingle();
    if (!card) return NextResponse.json({ error: "ไม่พบการ์ดของคุณ" }, { status: 404 });
  }

  const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const { error: uploadError } = await supabase.storage.from("slips").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    console.error("Payment slip upload error:", uploadError);
    return NextResponse.json({ error: "ไม่สามารถอัปโหลดสลิปได้ กรุณาลองใหม่" }, { status: 500 });
  }

  const slipUrl = supabase.storage.from("slips").getPublicUrl(path).data.publicUrl;
  const { data: payment, error } = await supabase.from("payments").insert({
    user_id: user.id,
    amount,
    credits_granted: creditsGranted,
    slip_url: slipUrl,
    status: "pending",
    payment_type: paymentType,
    package_type: packageType || null,
    card_id: typeof cardId === "string" ? cardId : null,
    claimed_transfer_time: claimedTime.toISOString(),
    claimed_bank_account_last4: claimedLast4,
  }).select("id, status").single();

  if (error || !payment) {
    if (error) console.error("Payment submission database error:", error);
    await supabase.storage.from("slips").remove([path]);
    return NextResponse.json({ error: "ไม่สามารถส่งข้อมูลการชำระเงินได้ กรุณาลองใหม่" }, { status: 500 });
  }

  return NextResponse.json({ success: true, payment }, { status: 201 });
}

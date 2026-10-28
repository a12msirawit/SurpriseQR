import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  function validationError(errorMessage: string) {
    console.error("Purchase error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const type = body.type;
  const cardReference = typeof body.cardId === "string" ? body.cardId.trim() : null;
  if (type !== "add_on_permanent") return validationError("ประเภท Add-on ไม่ถูกต้อง");
  if (type === "add_on_permanent" && !cardReference) return validationError("กรุณาระบุการ์ดที่ต้องการเก็บถาวร");

  let cardId: string | null = null;
  if (cardReference) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cardReference);
    const query = supabase.from("cards").select("id").eq("user_id", user.id);
    const { data: card, error: cardError } = isUuid
      ? await query.eq("id", cardReference).maybeSingle()
      : await query.eq("hash_id", cardReference).maybeSingle();
    if (cardError || !card) return validationError("ไม่พบข้อมูลการ์ด");
    cardId = card.id;
  }

  const { data, error } = await supabase.rpc("purchase_add_on", { p_type: type, p_card_id: cardId });
  if (error) {
    const status = /insufficient credits/i.test(error.message) ? 402 : 400;
    const errorMessage = status === 402 ? "ยอดเงินไม่เพียงพอ" : "ไม่สามารถซื้อสิทธิ์เสริมได้ กรุณาลองใหม่";
    console.error("Purchase RPC error:", error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ success: true, remainingCredits: result?.remaining_credits ?? null });
}
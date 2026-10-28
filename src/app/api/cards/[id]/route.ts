import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidPin, validateCustomSlug } from "@/lib/tierRules";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the card (draft or otherwise) plus any stored scenes so the creation
  // wizard (`/dashboard/create?draftId=`) can hydrate its form + config.
  const [{ data: card, error: cardError }, { data: scenes, error: scenesError }] =
    await Promise.all([
      supabase.from("cards").select("*").eq("id", id).maybeSingle(),
      supabase.from("card_scenes").select("*").eq("card_id", id).order("scene_order", { ascending: true }),
    ]);

  if (cardError || !card) {
    return NextResponse.json({ error: "ไม่พบการ์ด" }, { status: 404 });
  }
  if (card.user_id !== user.id) {
    return NextResponse.json({ error: "คุณสามารถแก้ไขได้เฉพาะการ์ดของคุณ" }, { status: 403 });
  }
  if (scenesError) {
    console.error("Card scenes fetch error:", scenesError.message);
  }

  return NextResponse.json({ card, scenes: scenes ?? [] }, { status: 200 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("cards")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Card deletion error:", error);
    return NextResponse.json({ error: "ไม่สามารถลบการ์ดได้ กรุณาลองใหม่" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { data: card } = await supabase.from("cards").select("is_permanent, custom_slug").eq("id", id).eq("user_id", user.id).single();
  if (!card) return NextResponse.json({ error: "ไม่พบการ์ดของคุณ" }, { status: 404 });
  const { data: profile } = await supabase.from("profiles").select("tier").eq("id", user.id).single();
  const body = (await request.json()) as {
    customSlug?: string | null;
    pinCode?: string | null;
  };
  const wantsUrl = Object.prototype.hasOwnProperty.call(body, "customSlug");
  const wantsPin = Object.prototype.hasOwnProperty.call(body, "pinCode");

  if (!wantsUrl && !wantsPin) {
    return NextResponse.json({ error: "ไม่มีข้อมูลที่ต้องการแก้ไข" }, { status: 400 });
  }

  if (wantsPin && !isValidPin(body.pinCode)) {
    return NextResponse.json({ error: "รหัส PIN ต้องเป็นตัวเลข 4 หลัก" }, { status: 400 });
  }

  const update: { custom_slug?: string | null; pin_code?: string | null } = {};
  let responseSlug: string | null | undefined = undefined;

  if (wantsUrl) {
    const input = (body.customSlug ?? "").trim();
    if (!card.is_permanent && profile?.tier !== "pro" && profile?.tier !== "god" && profile?.tier !== "vip") {
      return NextResponse.json({ error: "การ์ดนี้ยังไม่มีสิทธิ์ใช้ Custom URL" }, { status: 403 });
    }
    if (card.custom_slug) {
      return NextResponse.json({ error: "ตั้งชื่อ URL แล้วไม่สามารถแก้ไขได้อีก" }, { status: 400 });
    }
    if (!input) {
      return NextResponse.json({ error: "กรุณากรอก Custom URL" }, { status: 400 });
    }
    const result = validateCustomSlug(input);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    update.custom_slug = result.slug;
    responseSlug = result.slug;
  }

  if (wantsPin) {
    update.pin_code = body.pinCode || null;
  }

  const { error } = await supabase
    .from("cards")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "ไม่สามารถบันทึกข้อมูลได้" }, { status: 500 });

  return NextResponse.json(
    {
      success: true,
      customSlug: responseSlug,
      pinCode: wantsPin ? body.pinCode ?? null : undefined,
    },
    { status: 200 },
  );
}

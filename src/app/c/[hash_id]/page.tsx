import { createClient } from "@/lib/supabase/server";
import CardViewer from "@/components/cards/card-viewer";
import Link from "next/link";
import type { Card, Profile } from "@/types/database";

export default async function CardViewPage({ params }: { params: Promise<{ hash_id: string }> }) {
  const { hash_id } = await params;
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: card } = await supabase
    .from("cards")
    .select("*, profiles!inner(tier)")
    .or(`hash_id.eq.${hash_id},custom_slug.eq.${hash_id}`)
    .or(`draft_expires_at.is.null,draft_expires_at.gte.${now}`)
    .or(`expires_at.is.null,expires_at.gte.${now}`)
    .single();

  if (!card) {
    const { data: expiredCard } = await supabase
      .from("cards")
      .select("draft_expires_at")
      .or(`hash_id.eq.${hash_id},custom_slug.eq.${hash_id}`)
      .maybeSingle();

    const { data: expiredStorageCard } = await supabase
      .from("cards")
      .select("expires_at")
      .or(`hash_id.eq.${hash_id},custom_slug.eq.${hash_id}`)
      .lt("expires_at", now)
      .maybeSingle();

    return (
      <main>
        <h1>{expiredCard || expiredStorageCard ? "การ์ดหมดอายุแล้ว" : "ไม่พบการ์ด"}</h1>
        <p>{expiredCard || expiredStorageCard ? "การ์ดนี้หมดอายุแล้ว" : "การ์ดนี้ไม่มีอยู่หรือถูกลบแล้ว"}</p>
        <Link href="/">กลับหน้าแรก</Link>
      </main>
    );
  }

  // MODERATION GUARD: hidden/flagged cards are withheld from public viewing.
  const moderationStatus = (card as unknown as { status?: string }).status;
  if (moderationStatus === "hidden" || moderationStatus === "flagged") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-800">🚫 การ์ดนี้ถูกระงับการเข้าชม</h1>
        <p className="text-slate-500">การ์ดนี้อยู่ระหว่างการตรวจสอบเนื้อหา หรือถูกผู้ดูแลระบบระงับการเข้าชมชั่วคราว</p>
        <Link href="/" className="mt-2 rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100">
          กลับหน้าแรก
        </Link>
      </main>
    );
  }

  const { data: sceneRows } = await supabase
    .from("card_scenes")
    .select("id, scene_order, scene_type, content")
    .eq("card_id", card.id)
    .order("scene_order");

  const scenes = (sceneRows ?? []).map((scene) => {
    let content: { title?: string; body?: string; media_url?: string } = {};
    try {
      content = JSON.parse(scene.content);
    } catch {
      content = { body: scene.content };
    }
    return {
      id: scene.id,
      type: scene.scene_type,
      title: content.title ?? `Scene ${scene.scene_order + 1}`,
      body: content.body ?? "",
      media_url: content.media_url,
    };
  });

  const typedCard = { ...card, scenes } as Card & { profiles: Profile };
  const profile = typedCard.profiles;

  return (
    <main>
      <CardViewer
        card={typedCard}
        ownerTier={profile.tier}
        hashId={hash_id}
      />
    </main>
  );
}

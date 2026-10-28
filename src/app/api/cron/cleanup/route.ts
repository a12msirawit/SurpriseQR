import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.replace("Bearer ", "") !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  // Get expired cards from old system (expiry_date)
  const { data: oldExpiredCards, error: oldFetchError } = await supabase
    .from("cards")
    .select("id, image_url, audio_url, user_id")
    .lt("expiry_date", now)
    .not("expiry_date", "is", null);

  // Get expired cards from new monetization system (expires_at)
  const { data: newExpiredCards, error: newFetchError } = await supabase
    .from("cards")
    .select("id, image_url, audio_url, user_id")
    .lt("expires_at", now)
    .not("expires_at", "is", null);

  if (oldFetchError && newFetchError) {
    return NextResponse.json({ error: "Failed to fetch expired cards" }, { status: 500 });
  }

  const allExpiredCards = [
    ...(oldExpiredCards || []),
    ...(newExpiredCards || [])
  ];

  if (allExpiredCards.length === 0) {
    return NextResponse.json({ deleted: 0, message: "No expired cards found" });
  }

  // Collect files to delete
  const filesToDelete: string[] = [];
  allExpiredCards.forEach((card) => {
    if (card.image_url) {
      const imagePath = card.image_url.split("/").pop();
      if (imagePath) filesToDelete.push(imagePath);
    }
    if (card.audio_url) {
      const audioPath = card.audio_url.split("/").pop();
      if (audioPath && !card.audio_url.startsWith("http")) {
        filesToDelete.push(audioPath);
      }
    }
  });

  // Delete storage files
  if (filesToDelete.length > 0) {
    await supabase.storage.from("card-media").remove(filesToDelete);
  }

  // Delete associated scenes
  const cardIdsToDelete = allExpiredCards.map((card) => card.id);
  await supabase.from("card_scenes").delete().in("card_id", cardIdsToDelete);

  // Delete reactions
  await supabase.from("reactions").delete().in("card_id", cardIdsToDelete);

  // Delete cards
  const { error: deleteError } = await supabase
    .from("cards")
    .delete()
    .in("id", cardIdsToDelete);

  if (deleteError) {
    console.error("Expired card deletion error:", deleteError);
    return NextResponse.json({ error: "Failed to delete expired cards" }, { status: 500 });
  }

  return NextResponse.json({
    deleted: allExpiredCards.length,
    message: `Successfully deleted ${allExpiredCards.length} expired cards`,
  });
}

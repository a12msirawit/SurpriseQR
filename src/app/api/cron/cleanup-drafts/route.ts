import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    // Get expired drafts
    const { data: expiredDrafts, error: fetchError } = await supabase
      .from("cards")
      .select("id, image_url, audio_url")
      .eq("status", "draft")
      .lt("draft_expires_at", new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!expiredDrafts || expiredDrafts.length === 0) {
      return NextResponse.json({ message: "No expired drafts found" });
    }

    // Delete storage files for each draft
    for (const draft of expiredDrafts) {
      if (draft.image_url) {
        const imagePath = draft.image_url.split("/").pop();
        if (imagePath) {
                  await supabase.storage.from("card-media").remove([imagePath]);
        }
      }
      if (draft.audio_url) {
        const audioPath = draft.audio_url.split("/").pop();
        if (audioPath) {
                    await supabase.storage.from("card-media").remove([audioPath]);
        }
      }
    }

    // Delete expired drafts from database
    const { error: deleteError } = await supabase
      .from("cards")
      .delete()
      .eq("status", "draft")
      .lt("draft_expires_at", new Date().toISOString());

    if (deleteError) throw deleteError;

    return NextResponse.json({ 
      message: `Cleaned up ${expiredDrafts.length} expired drafts` 
    });
  } catch (error) {
    console.error("Draft cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup drafts" },
      { status: 500 }
    );
  }
}

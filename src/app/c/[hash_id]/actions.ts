"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ReactionType } from "@/types/database";

export async function verifyCardPin(hashId: string, pinCode: string) {
  const supabase = await createClient();

  // SECURITY: compares the stored pin server-side via a SECURITY DEFINER RPC
  // so the plaintext pin is never returned to the client. This replaced the
  // former direct `select("pin_code")` table read, which anonymous visitors
  // could no longer perform once cards.pin_code was withheld from `anon`.
  const { data: matches, error } = await supabase.rpc("verify_card_pin", {
    p_hash_id: hashId,
    p_pin: String(pinCode ?? "").trim(),
  });

  if (error) {
    return { success: false, error: "Incorrect PIN" };
  }

  // NULL result means the card row was not found.
  if (matches === null || matches === undefined) {
    return { success: false, error: "Card not found" };
  }

  return { success: matches, error: matches ? undefined : "Incorrect PIN" };
}

export async function incrementCardViewCount(hashId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc('increment_view_count', {
    card_hash_id: hashId
  });

  if (error) {
    // Fallback to direct update if RPC doesn't exist
    const { data: currentCard } = await supabase
      .from("cards")
      .select("view_count")
      .eq("hash_id", hashId)
      .single();
    
    if (currentCard) {
      await supabase
        .from("cards")
        .update({ view_count: currentCard.view_count + 1 })
        .eq("hash_id", hashId);
    }
  }

  return { success: true };
}

export async function submitCardReaction(
  hashId: string,
  reactionType: ReactionType | null,
  message: string | null
) {
  const supabase = await createClient();

  // Get card ID
  const { data: card } = await supabase
    .from("cards")
    .select("id")
    .eq("hash_id", hashId)
    .or(`draft_expires_at.is.null,draft_expires_at.gte.${new Date().toISOString()}`)
    .single();

  if (!card) {
    return { success: false, error: "Card not found" };
  }

  const { error } = await supabase.from("reactions").insert({
    card_id: card.id,
    reaction_type: reactionType,
    message: message,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/c/${hashId}`);
  return { success: true };
}

export async function getCardWithDetails(hashId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_card_with_details', {
    card_hash_id: hashId
  });

  if (error || !data) {
    return { success: false, error: error?.message ?? "Failed to fetch card" };
  }

  return { success: true, data };
}

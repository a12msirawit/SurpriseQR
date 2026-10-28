"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uploadCardMedia } from "@/lib/storage-server";
import { getMediaLimit, isPaidTier, isValidPin, resolveMediaTier, validateCustomSlug } from "@/lib/tierRules";
import type { CardStatus, DatabaseSceneType, StorageType } from "@/types/database";
import {
  computeAndApplyCharges,
  createCardCore,
  deductCredits,
  refundCredits,
  resolveTemplate,
  ROYALTY_FREE_AUDIO,
  type CoreCardInputBase,
} from "@/lib/cards/create-card-core";

export async function createCard(formData: FormData) {
  const user = await requireAuth();
  const profile = await getProfile();
  const supabase = await createClient();

  if (!profile) {
    return { error: "Profile not found." };
  }

  const recipientName = formData.get("recipient_name") as string;
  const senderName = formData.get("sender_name") as string;
  const message = formData.get("message") as string;
  const pinCode = formData.get("pin_code") as string;
  const templateId = formData.get("template_id") as string;
  const imageFile = formData.get("image") as File | null;
  const audioFile = formData.get("audio") as File | null;
  const audioSelection = formData.get("audio_selection") as string;
  const unlockAt = formData.get("unlock_at") as string;
  const scenesJson = formData.get("scenes") as string;

  const templateCost = parseInt((formData.get("template_cost") as string) || "0");
  const storageType = (formData.get("storage_type") as StorageType) || "14_days";
  const storageCost = parseInt((formData.get("storage_cost") as string) || "0");
  const customUrlCost = parseInt((formData.get("custom_url_cost") as string) || "0");
  const customSlugInput = formData.get("custom_slug") as string;
  const audioType = formData.get("audio_type") as "youtube" | "mp3" | "video";
  const password = formData.get("password") as string;
  const hasWatermark = formData.get("has_watermark") !== "false";

  let parsedScenes: CoreCardInputBase["scenes"] = undefined;
  if (scenesJson) {
    try {
      const raw = JSON.parse(scenesJson) as Array<{
        scene_order: number;
        scene_type: DatabaseSceneType;
        content: string;
      }>;
      parsedScenes = raw.map((s) => ({
        scene_order: s.scene_order,
        scene_type: s.scene_type,
        content: typeof s.content === "string" ? s.content : JSON.stringify(s.content),
      }));
    } catch {
      return { error: "Invalid scenes data format." };
    }
  }

  const result = await createCardCore(
    {
      templateId,
      recipientName,
      senderName,
      message,
      pinCode,
      unlockAt,
      imageFile,
      audioFile,
      audioSelection,
      audioType,
      password,
      customSlugInput,
      hasWatermark,
      templateCost,
      storageType,
      storageCost,
      customUrlCost,
      scenes: parsedScenes,
    },
    {
      user: { id: user.id },
      profile: {
        id: profile.id,
        tier: profile.tier,
        tier_raw: profile.tier,
        credits: Number(profile.credits ?? 0),
        permanent_quota: Number(profile.permanent_quota ?? 0),
        premium_quota: Number(profile.premium_quota ?? 0),
        custom_url_quota: Number(profile.custom_url_quota ?? 0),
        quota_expires_at: profile.quota_expires_at ?? null,
        package_tier: profile.package_tier ?? null,
        package_expires_at: profile.package_expires_at ?? null,
      },
      mode: "action",
    },
  );

  if (result.error) {
    void supabase;
    return { error: result.error };
  }

  revalidatePath("/dashboard");
  return {
    success: true,
    hashId: result.hashId,
    cardId: result.cardId,
    remainingCredits: result.remainingCredits,
  };
}

export async function updateCard(cardId: string, formData: FormData) {
  const user = await requireAuth();
  const profile = await getProfile();
  const supabase = await createClient();

  if (!profile) {
    return { error: "Profile not found." };
  }

  const tier = profile.tier;
  // Media limits are time-boxed by the active package window (see
  // resolveMediaTier): expired/NULL package -> free-tier defaults, while the
  // user keeps every accumulated quota balance.
  const mediaTier = resolveMediaTier({
    tier,
    packageTier: profile.package_tier,
    packageExpiresAt: profile.package_expires_at,
  });
  const isPremium = isPaidTier(tier);

  const { data: existingCard } = await supabase
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (!existingCard) {
    return { error: "Card not found." };
  }

  if (existingCard.user_id !== user.id) {
    return { error: "You can only edit your own cards." };
  }

  const isPublished = existingCard.status === "published";

  if (!isPremium && existingCard.expiry_date) {
    const expiryDate = new Date(existingCard.expiry_date);
    if (expiryDate < new Date()) {
      return { error: "Cannot edit expired cards." };
    }
  }

  const recipientName = formData.get("recipient_name") as string;
  const senderName = formData.get("sender_name") as string;
  const message = formData.get("message") as string;
  const pinCode = formData.get("pin_code") as string;
  const imageFile = formData.get("image") as File | null;
  const image1File = formData.get("image_1") as File | null;
  const image2File = formData.get("image_2") as File | null;
  const audioFile = formData.get("audio") as File | null;
  const audioSelection = formData.get("audio_selection") as string;
  const deleteImage = formData.get("delete_image") === "on";
  const deleteAudio = formData.get("delete_audio") === "on";
  const customSlugInput = formData.get("custom_slug") as string | null;

  if (isPublished) {
    // Published cards are content-locked: only PIN + custom_slug are mutable,
    // and custom_slug itself is gated to permanent cards (see below).
    const contentChanged =
      (recipientName && recipientName !== existingCard.recipient_name) ||
      (senderName && senderName !== existingCard.sender_name) ||
      (message && message !== existingCard.message) ||
      imageFile ||
      image1File ||
      image2File ||
      audioFile ||
      deleteImage ||
      deleteAudio;
    if (contentChanged) {
      return { error: "การ์ดที่เผยแพร่แล้วแก้ไขได้เฉพาะ PIN และ Custom URL" };
    }
  } else {
    if (!recipientName || !senderName || !message) {
      return { error: "Recipient name, sender name, and message are required." };
    }
  }

  if (!isValidPin(pinCode)) {
    return { error: "รหัส PIN ต้องเป็นตัวเลข 4 หลัก" };
  }

  // custom_slug is a premium/permanent-card-only field. Reject writes from
  // any non-permanent card regardless of how the form was submitted. After
  // a URL is set it becomes immutable — clients cannot change or clear it.
  if (customSlugInput !== null && customSlugInput !== "" && !existingCard.is_permanent) {
    return { error: "Custom URL ใช้ได้เฉพาะการ์ดถาวรเท่านั้น" };
  }
  if (
    existingCard.custom_slug &&
    customSlugInput !== null &&
    customSlugInput !== "" &&
    customSlugInput !== existingCard.custom_slug
  ) {
    return { error: "ตั้งชื่อ URL แล้วไม่สามารถแก้ไขได้อีก" };
  }

  let imageUrl = existingCard.image_url;
  let image1Url = existingCard.image_1;
  let image2Url = existingCard.image_2;
  let audioUrl = existingCard.audio_url;

  async function removeStorageObject(url: string | null | undefined) {
    if (!url) return;
    const oldPath = url.split("/").pop();
    if (!oldPath) return;
    try {
      await supabase.storage.from("card-media").remove([oldPath]);
    } catch {
      /* best-effort cleanup */
    }
  }

  if (deleteImage && imageUrl) {
    await removeStorageObject(imageUrl);
    imageUrl = null;
  }

  if (deleteAudio && audioUrl && !ROYALTY_FREE_AUDIO.includes(audioUrl)) {
    await removeStorageObject(audioUrl);
    audioUrl = null;
  }

  if (imageFile && imageFile.size > 0) {
    const maxImageMB = getMediaLimit(mediaTier, "image");
    const maxImageBytes = maxImageMB * 1024 * 1024;

    if (imageFile.size > maxImageBytes) {
      return { error: `Image size exceeds ${maxImageMB}MB limit.` };
    }

    await removeStorageObject(imageUrl);
    const { url, error: uploadError } = await uploadCardMedia(imageFile, user.id, cardId);
    if (uploadError) {
      return { error: uploadError };
    }
    imageUrl = url;
  }

  for (const [field, file] of [["image_1", image1File], ["image_2", image2File]] as const) {
    if (!file || file.size === 0) continue;
    const maxImageMB = getMediaLimit(mediaTier, "image");
    if (file.size > maxImageMB * 1024 * 1024) return { error: `ขนาด${field}เกิน ${maxImageMB}MB` };
    const previous = field === "image_1" ? image1Url : image2Url;
    await removeStorageObject(previous);
    const { url, error: uploadError } = await uploadCardMedia(file, user.id, cardId);
    if (uploadError) return { error: uploadError };
    if (field === "image_1") image1Url = url;
    else image2Url = url;
  }

  if (audioFile && audioFile.size > 0) {
    const maxAudioMB = getMediaLimit(mediaTier, "audio");
    const maxAudioBytes = maxAudioMB * 1024 * 1024;

    if (audioFile.size > maxAudioBytes) {
      return { error: `Audio size exceeds ${maxAudioMB}MB limit.` };
    }

    if (audioUrl && !ROYALTY_FREE_AUDIO.includes(audioUrl)) {
      await removeStorageObject(audioUrl);
    }

    const { url, error: uploadError } = await uploadCardMedia(audioFile, user.id, cardId);
    if (uploadError) {
      return { error: uploadError };
    }
    audioUrl = url;
  } else if (audioSelection && ROYALTY_FREE_AUDIO.includes(audioSelection)) {
    // Switching from a custom upload to a royalty-free preset: delete the
    // orphan object from storage. If audioUrl was already a preset, nothing
    // changes.
    if (audioUrl && !ROYALTY_FREE_AUDIO.includes(audioUrl) && audioUrl !== audioSelection) {
      await removeStorageObject(audioUrl);
    }
    audioUrl = audioSelection;
  }

  const { error: updateError } = await supabase
    .from("cards")
    .update({
      ...(isPublished
        ? {}
        : {
            recipient_name: recipientName,
            sender_name: senderName,
            message,
            image_url: imageUrl,
            image_1: image1Url,
            image_2: image2Url,
            audio_url: audioUrl,
          }),
      pin_code: pinCode || null,
      ...(customSlugInput !== null
        ? { custom_slug: customSlugInput ? validateCustomSlug(customSlugInput).slug : null }
        : {}),
    })
    .eq("id", cardId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/cards/${cardId}/edit`);
  return { success: true };
}

export async function getCardForEdit(cardId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: card } = await supabase
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (!card) {
    return { error: "Card not found." };
  }

  if (card.user_id !== user.id) {
    return { error: "You can only edit your own cards." };
  }

  return { card };
}
/**
 * Unified draft editing (creation wizard <-> draft record):
 * Updates an existing DRAFT card in place so "Edit Draft" never duplicates
 * cards. `is_draft=false` transitions the draft to published and performs the
 * deferred publish-time charging (template/storage/custom-url) through the
 * exact same pipeline used at creation time (computeAndApplyCharges +
 * deductCredits), so entitlement rules can never drift between the two flows.
 *
 * Security notes:
 * - SEC-1: ownership is verified server-side against the authenticated user;
 *   client-sent ids/costs are treated as untrusted input, costs are clamped
 *   by computeAndApplyCharges against the server-resolved template.
 * - SEC-4: the draft->published status flip uses a conditional
 *   `.eq("status", "draft")` update; a double-submit finds zero rows and
 *   returns before any charge is applied, so publishing can never charge or
 *   take effect more than once.
 * - SEC-2: no service-role writes happen here beyond the helpers in
 *   create-card-core.ts (credits/quota profile columns are RLS-denied to the
 *   client role and must be elevated — see the comment block there).
 */
export async function updateDraftCard(formData: FormData) {
  const user = await requireAuth();
  const profile = await getProfile();
  const supabase = await createClient();

  if (!profile) {
    return { error: "Profile not found." };
  }

  const cardId = formData.get("card_id") as string;
  if (!cardId) {
    return { error: "Card id is required." };
  }

  const { data: existingCard } = await supabase
    .from("cards")
    .select("id, user_id, status, message, template_id, storage_type, image_url, audio_url")
    .eq("id", cardId)
    .single();

  if (!existingCard) {
    return { error: "Card not found." };
  }
  if (existingCard.user_id !== user.id) {
    return { error: "You can only edit your own cards." };
  }
  // Draft editing applies exclusively to draft records; published cards are
  // content-locked by design and only accept updateCard's limited changes.
  if (existingCard.status !== "draft") {
    return { error: "การ์ดนี้ถูกเผยแพร่แล้วและไม่สามารถแก้ไขเนื้อหาได้อีก" };
  }

  const publishNow = formData.get("is_draft") !== "true";
  const contentRaw = formData.get("content") as string | null;
  const recipientName = formData.get("recipient_name") as string;
  const senderName = formData.get("sender_name") as string;
  const pinCode = formData.get("pin_code") as string;
  const templateIdInput =
    (formData.get("template_id") as string) ||
    (formData.get("templateId") as string) ||
    (existingCard.template_id as string);
  const templateCost = parseInt((formData.get("template_cost") as string) || "0", 10) || 0;
  const storageType = ((formData.get("storage_type") as StorageType) || (existingCard.storage_type as StorageType) || "14_days") as StorageType;
  const storageCost = parseInt((formData.get("storage_cost") as string) || "0", 10) || 0;
  const customSlugRaw = ((formData.get("custom_slug") as string) || "").trim();

  if (!recipientName || !senderName) {
    return { error: "Recipient name and sender name are required." };
  }
  if (!isValidPin(pinCode)) {
    return { error: "รหัส PIN ต้องเป็นตัวเลข 4 หลัก" };
  }

  // DONT-2: the template id is resolved against the templates table; a
  // client-invented id can never be persisted.
  const template = await resolveTemplate(supabase, templateIdInput);
  if (!template) {
    return { error: "Template not found." };
  }

  // Merge the wizard payload into the existing message JSON so template
  // metadata written at creation time (templateId, heroImage, themeColor, ...)
  // survives every save. Legacy plain-text messages are upgraded to the
  // structured shape; malformed blobs start from an empty base.
  let mergedMessage = "";
  const rawMessage = typeof existingCard.message === "string" ? existingCard.message : "";
  if (contentRaw) {
    try {
      const incoming: unknown = JSON.parse(contentRaw);
      if (incoming && typeof incoming === "object" && !Array.isArray(incoming)) {
        let existingBlob: Record<string, unknown> = {};
        if (/^\s*\{/.test(rawMessage)) {
          try {
            const parsed: unknown = JSON.parse(rawMessage);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              existingBlob = parsed as Record<string, unknown>;
            }
          } catch {
            /* malformed legacy blob: start from an empty base */
          }
        }
        mergedMessage = JSON.stringify({
          ...existingBlob,
          ...(incoming as Record<string, unknown>),
          templateId: template.id,
        });
      } else {
        mergedMessage = contentRaw;
      }
    } catch {
      mergedMessage = contentRaw;
    }
  } else {
    mergedMessage = rawMessage;
  }

  // Media uploads mirror updateCard: time-boxed media-tier limits (expired
  // package falls back to free-tier defaults), stored object replaced on
  // upload, royalty-free selections untouched.
  const mediaTier = resolveMediaTier({
    tier: profile.tier,
    packageTier: profile.package_tier ?? null,
    packageExpiresAt: profile.package_expires_at ?? null,
  });

  const imageFile = formData.get("image") as File | null;
  const audioFile = formData.get("audio") as File | null;
  let imageUrl = existingCard.image_url as string | null;
  let audioUrl = existingCard.audio_url as string | null;

  if (imageFile && imageFile.size > 0) {
    const maxImageMB = getMediaLimit(mediaTier, "image");
    if (imageFile.size > maxImageMB * 1024 * 1024) {
      return { error: `Image size exceeds ${maxImageMB}MB limit.` };
    }
    const { url, error: uploadError } = await uploadCardMedia(imageFile, user.id, cardId);
    if (uploadError) {
      return { error: uploadError };
    }
    imageUrl = url;
  }
  if (audioFile && audioFile.size > 0) {
    const maxAudioMB = getMediaLimit(mediaTier, "audio");
    if (audioFile.size > maxAudioMB * 1024 * 1024) {
      return { error: `Audio size exceeds ${maxAudioMB}MB limit.` };
    }
    const { url, error: uploadError } = await uploadCardMedia(audioFile, user.id, cardId);
    if (uploadError) {
      return { error: uploadError };
    }
    audioUrl = url;
  }

  const contentUpdate = {
    template_id: template.id,
    recipient_name: recipientName,
    sender_name: senderName,
    message: mergedMessage,
    image_url: imageUrl,
    audio_url: audioUrl,
    pin_code: pinCode || null,
    ...(customSlugRaw
      ? { custom_slug: validateCustomSlug(customSlugRaw).slug }
      : {}),
  };

  if (!publishNow) {
    // Draft save: refresh the 7-day retention window; money is never touched.
    const { error: updateError } = await supabase
      .from("cards")
      .update({
        ...contentUpdate,
        draft_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", cardId)
      .eq("user_id", user.id)
      .eq("status", "draft");

    if (updateError) {
      return { error: updateError.message };
    }
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/drafts");
    return { success: true, status: "draft" as CardStatus };
  }

  // ---- Publish path: draft -> published with deferred charging ----
  // SEC-4: flip the status FIRST via a conditional update. A double-submit
  // (or a card published concurrently in another tab) matches zero rows and
  // returns before computeAndApplyCharges/deductCredits ever run.
  const { data: transitioned, error: transitionError } = await supabase
    .from("cards")
    .update({ status: "published", draft_expires_at: null })
    .eq("id", cardId)
    .eq("user_id", user.id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (transitionError) {
    return { error: transitionError.message };
  }
  if (!transitioned) {
    return { error: "การ์ดนี้ถูกเผยแพร่ไปแล้ว" };
  }

  const revertToDraft = async () => {
    try {
      await supabase
        .from("cards")
        .update({ status: "draft", draft_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
        .eq("id", cardId)
        .eq("user_id", user.id);
    } catch {
      /* best-effort revert */
    }
  };

  const charges = await computeAndApplyCharges(
    supabase,
    {
      user: { id: user.id },
      profile: {
        id: profile.id,
        tier: profile.tier,
        tier_raw: profile.tier,
        credits: Number(profile.credits ?? 0),
        permanent_quota: Number(profile.permanent_quota ?? 0),
        premium_quota: Number(profile.premium_quota ?? 0),
        custom_url_quota: Number(profile.custom_url_quota ?? 0),
        quota_expires_at: profile.quota_expires_at ?? null,
        package_tier: profile.package_tier ?? null,
        package_expires_at: profile.package_expires_at ?? null,
      },
      isDraft: false,
      mode: "action",
    },
    template,
    {
      templateId: template.id,
      recipientName,
      senderName,
      message: mergedMessage,
      pinCode,
      templateCost,
      storageType,
      storageCost,
      customSlugInput: customSlugRaw || null,
    },
  );
  if (charges.error) {
    await revertToDraft();
    return { error: charges.error };
  }

  const creditErr = await deductCredits(supabase, user.id, charges.totalCost);
  if (creditErr) {
    await revertToDraft();
    return { error: creditErr };
  }

  // Publishing restarts the storage window from NOW, mirroring fresh creation
  // (14-day storage gets a full 14 days even if the draft sat for days).
  const expiresAt =
    storageType === "14_days"
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const { error: updateError } = await supabase
    .from("cards")
    .update({
      ...contentUpdate,
      storage_type: storageType,
      is_permanent: storageType === "permanent",
      expires_at: expiresAt,
      template_cost: templateCost,
      storage_cost: storageCost,
    })
    .eq("id", cardId)
    .eq("user_id", user.id);

  if (updateError) {
    await refundCredits(supabase, user.id, charges.totalCost);
    await revertToDraft();
    return { error: updateError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/drafts");
  return { success: true, status: "published" as CardStatus };
}

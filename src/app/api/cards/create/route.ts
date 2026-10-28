export const config = {
  api: {
    bodySizeLimit: '50mb',
  },
};

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateHashId } from "@/lib/image-compression";
import { isUserBanned } from "@/lib/auth";
import {
  validateCustomSlug,
  type AudioType,
} from "@/lib/tierRules";
import type { CardStatus, StorageType } from "@/types/database";
import {
  validateCardBasics,
  resolveTemplate,
  computeAndApplyCharges,
  deductCredits,
  refundCredits,
  checkFreeDailyLimit,
  isPremiumTier,
  getMediaMaxMB,
  type CoreCardInputBase,
} from "@/lib/cards/create-card-core";

type SceneInput = {
  title?: string;
  body?: string;
  media_url?: string;
  mediaUrl?: string;
  scene_type?: "text" | "image" | "audio" | "video";
  sceneType?: "text" | "image" | "audio" | "video";
};

type Metadata = {
  title?: string;
  cardTitle?: string;
  templateId?: string;
  template_id?: string;
  recipientName?: string;
  recipient_name?: string;
  senderName?: string;
  sender_name?: string;
  content?: unknown;
  config?: unknown;
  scenes?: SceneInput[];
  storageType?: StorageType;
  storage_type?: StorageType;
  storageCost?: number;
  storage_cost?: number;
  customUrlCost?: number;
  custom_url_cost?: number;
  templateCost?: number;
  template_cost?: number;
  expiresAt?: string | null;
  expires_at?: string | null;
  unlockAt?: string | null;
  unlock_at?: string | null;
  pinCode?: string;
  pin_code?: string;
  isDraft?: boolean;
  is_draft?: boolean;
  customSlug?: string | null;
  custom_slug?: string | null;
  audioType?: AudioType | null;
  audio_type?: AudioType | null;
  password?: string | null;
  hasWatermark?: boolean;
  has_watermark?: boolean;
  usePremiumQuota?: boolean;
  use_premium_quota?: boolean;
  usePermanentQuota?: boolean;
  use_permanent_quota?: boolean;
};

const MAX_MEDIA_FILE_BYTES = 1024 * 1024;

function parseJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Parse an optional boolean from metadata or form data; absent → undefined (legacy intent). */
function parseOptionalBool(value: unknown): boolean | undefined {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

function safeFileName(file: File) {
  const extension = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  const baseName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 80) || "media";
  return `${baseName}${extension}`;
}

function isFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const uploadedPaths: string[] = [];
  let cardId: string | null = null;
  let totalCost = 0;

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (await isUserBanned(user.id)) {
      return NextResponse.json({ error: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" }, { status: 403 });
    }
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error("Card creation FormData parse failed", {
        contentType: request.headers.get("content-type"),
        contentLength: request.headers.get("content-length"),
        message: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Invalid or oversized multipart form data" },
        { status: 400 },
      );
    }
    const metadata = parseJson<Metadata>(formData.get("metadata"), {});
    const isDraft = metadata.isDraft ?? metadata.is_draft ?? formData.get("is_draft") === "true";
    const content = metadata.content ?? parseJson(formData.get("content"), {});
    const config = metadata.config ?? parseJson(formData.get("config"), {});
    // Configs are persisted verbatim; render-shape detection happens at view
    // time via resolveTemplateRenderStrategy (no server-side sanitization).
    const scenes = metadata.scenes ?? parseJson<SceneInput[]>(formData.get("scenes"), []);
    const title = metadata.title ?? metadata.cardTitle ?? getString(formData.get("title")) ?? getString(formData.get("card_title")) ?? "Untitled Card";
    const templateId = metadata.templateId ?? metadata.template_id ?? getString(formData.get("templateId")) ?? getString(formData.get("template_id")) ?? getString(formData.get("template")) ?? "anniversary-surprise";
    const recipientName = metadata.recipientName ?? metadata.recipient_name ?? getString(formData.get("recipient_name")) ?? "Recipient";
    const senderName = metadata.senderName ?? metadata.sender_name ?? getString(formData.get("sender_name")) ?? "Sender";
    const storageType = metadata.storageType ?? metadata.storage_type ?? (getString(formData.get("storage_type")) as StorageType | undefined) ?? "14_days";
    const storageCost = Number(metadata.storageCost ?? metadata.storage_cost ?? formData.get("storage_cost") ?? 0);
    const customUrlCost = Number(metadata.customUrlCost ?? metadata.custom_url_cost ?? formData.get("custom_url_cost") ?? 0);
    const templateCost = Number(metadata.templateCost ?? metadata.template_cost ?? formData.get("template_cost") ?? 0);
    const unlockAtValue = metadata.unlockAt ?? metadata.unlock_at ?? getString(formData.get("unlock_at"));
    const pinCode = metadata.pinCode ?? metadata.pin_code ?? getString(formData.get("pin_code"));
    const customSlugInput = metadata.customSlug ?? metadata.custom_slug ?? getString(formData.get("custom_slug"));
    const audioType = (metadata.audioType ?? metadata.audio_type ?? getString(formData.get("audio_type"))) as AudioType | undefined;
    const password = metadata.password ?? getString(formData.get("password"));
    const hasWatermark = metadata.hasWatermark ?? metadata.has_watermark ?? formData.get("has_watermark") !== "false";
    // Explicit quota intent from the summary modal (absent = legacy client, in
    // which case computeAndApplyCharges falls back to auto-consume rules).
    const usePremiumQuota = parseOptionalBool(metadata.usePremiumQuota ?? metadata.use_premium_quota ?? formData.get("use_premium_quota"));
    const usePermanentQuota = parseOptionalBool(metadata.usePermanentQuota ?? metadata.use_permanent_quota ?? formData.get("use_permanent_quota"));
    const submittedAudio = formData.get("card_audio") ?? formData.get("audio");
    const resolvedAudioType = audioType ?? (isFile(submittedAudio)
      ? (submittedAudio.type === "video/mp4" ? "video" : "mp3")
      : (audioType ? audioType : undefined));

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const tierRaw = profile.tier as
      | "guest"
      | "free"
      | "starter"
      | "value"
      | "pro"
      | "vip";

    const basicValidation = validateCardBasics({
      templateId,
      recipientName,
      senderName,
      message:
        typeof content === "string"
          ? content
          : JSON.stringify(content || config || { text: title }),
      pinCode: pinCode ?? null,
      storageType,
      password: password ?? null,
    });
    if (basicValidation) {
      return NextResponse.json({ error: basicValidation }, { status: 400 });
    }

    for (const [key, value] of formData.entries()) {
      if (isFile(value) && value.size > MAX_MEDIA_FILE_BYTES) {
        return NextResponse.json(
          { error: `${key} must be 1 MB or smaller` },
          { status: 400 },
        );
      }
    }

    if (customSlugInput) {
      const customSlug = validateCustomSlug(customSlugInput);
      if (customSlug.error) return NextResponse.json({ error: customSlug.error }, { status: 400 });
    }

    const template = await resolveTemplate(supabase, templateId);
    if (!template) {
      return NextResponse.json({ error: "No templates are available" }, { status: 400 });
    }

    const inputForCharges: CoreCardInputBase = {
      templateId: template.id,
      recipientName,
      senderName,
      message: "",
      pinCode,
      unlockAt: unlockAtValue,
      customSlugInput,
      audioType: resolvedAudioType,
      password,
      hasWatermark,
      templateCost,
      storageType,
      storageCost,
      customUrlCost,
      usePremiumQuota,
      usePermanentQuota,
    };

    if (template.is_premium && tierRaw === "guest") {
      return NextResponse.json({ error: "Premium templates are not available for guest accounts" }, { status: 403 });
    }
    if (storageType === "permanent" && tierRaw === "guest") {
      return NextResponse.json({ error: "Permanent storage is not available for guest accounts" }, { status: 403 });
    }

    const rateErr = await checkFreeDailyLimit(supabase, user.id, tierRaw);
    if (rateErr) return NextResponse.json({ error: rateErr }, { status: 403 });

    const charges = await computeAndApplyCharges(
      supabase,
      {
        user: { id: user.id },
        profile: {
          id: profile.id,
          tier: profile.tier,
          tier_raw: tierRaw,
          credits: Number(profile.credits ?? 0),
          permanent_quota: Number(profile.permanent_quota ?? 0),
          premium_quota: Number(profile.premium_quota ?? 0),
          custom_url_quota: Number(profile.custom_url_quota ?? 0),
          quota_expires_at: profile.quota_expires_at ?? null,
          package_tier: profile.package_tier ?? null,
          package_expires_at: profile.package_expires_at ?? null,
        },
        isDraft,
        mode: "api",
      },
      template,
      inputForCharges,
    );
    if (charges.error) {
      return NextResponse.json({ error: charges.error }, { status: 403 });
    }
    totalCost = charges.totalCost;

    // Financial-intent reconciliation (SEC-4, legacy clients): clients that send
    // the explicit use_premium_quota / use_permanent_quota flags are handled
    // entirely inside computeAndApplyCharges (quota selected => quota consumed,
    // cash selected => quota untouched + billed). For LEGACY clients that omit
    // the flags, computeAndApplyCharges auto-consumes quota for priced premium
    // items; if such a client submitted a positive template_cost/storage_cost,
    // restore the auto-consumed quota and bill the cash instead, so intent
    // stays quota XOR cash (never both). Explicit-flag clients are excluded
    // below (usePremiumQuota/usePermanentQuota !== undefined) because their
    // chosen intent was already applied inside computeAndApplyCharges (quota
    // selected => quota consumed + item free). Non-quota holders never hit
    // these branches because totalCost already includes the cash amount.
    let amountToDeduct = totalCost;
    // Quota restores are financial mutations on public.profiles; the
    // authenticated role has no UPDATE grant there by design (migration
    // 20260823000005), so they run through the service-role client.
    const profileAdminDb = createAdminClient();
    if (!isDraft && template.is_premium && usePremiumQuota === undefined && templateCost > 0 && charges.premiumQuotaConsumed) {
      // User has a premium quota but chose to pay cash: undo the quota that
      // computeAndApplyCharges auto-consumed, then bill the cash amount on top
      // of totalCost (which excluded it for quota holders). For users WITHOUT a
      // quota, totalCost already includes templateCost, so we must NOT add again.
      await profileAdminDb
        .from("profiles")
        .update({ premium_quota: profile.premium_quota })
        .eq("id", user.id)
        .gt("premium_quota", 0);
      amountToDeduct += templateCost;
    }
    if (!isDraft && storageType === "permanent" && usePermanentQuota === undefined && storageCost > 0 && charges.permanentQuotaConsumed) {
      // User has a permanent quota but chose to pay cash: undo the quota that
      // computeAndApplyCharges auto-consumed, then bill the cash amount on top
      // of totalCost (which excluded it for quota holders). For users WITHOUT a
      // quota, totalCost already includes the 25-credit base rate, so we must
      // NOT add again — this prevents a double-charge.
      await profileAdminDb
        .from("profiles")
        .update({ permanent_quota: profile.permanent_quota })
        .eq("id", user.id)
        .gt("permanent_quota", 0);
      amountToDeduct += storageCost;
    }

    const uploadFile = async (file: File, folder: "images" | "audio") => {
      const path = `${folder}/${user.id}/${Date.now()}_${safeFileName(file)}`;
      const { error } = await supabase.storage.from("card-media").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (error) {
        console.error("Card media upload error:", error);
        throw new Error("Media upload failed");
      }
      uploadedPaths.push(path);
      return supabase.storage.from("card-media").getPublicUrl(path).data.publicUrl;
    };

    const sceneFileUrls = new Map<number, string>();
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("scene_image_") || !isFile(value)) continue;
      const index = Number(key.replace("scene_image_", ""));
      if (Number.isInteger(index) && index >= 0) sceneFileUrls.set(index, await uploadFile(value, "images"));
    }

    const cardImage = formData.get("card_image") ?? formData.get("image");
    const cardAudio = formData.get("card_audio") ?? formData.get("audio");
    const imageUrl = isFile(cardImage) ? await uploadFile(cardImage, "images") : null;
    const audioUrl = isFile(cardAudio) ? await uploadFile(cardAudio, "audio") : null;
    const expiresAt = storageType === "14_days"
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    // `unlock_at` is fully optional now that the UI no longer asks for card
    // open time. Missing/empty/invalid values resolve to `null` (= immediate
    // activation) instead of throwing RangeError -> HTTP 500.
    const parsedUnlockAt = unlockAtValue ? new Date(unlockAtValue) : null;
    const unlockAt =
      parsedUnlockAt && !Number.isNaN(parsedUnlockAt.getTime())
        ? parsedUnlockAt.toISOString()
        : null;
    const status: CardStatus = isDraft ? "draft" : "published";
    const draftExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const message = typeof content === "string" ? content : JSON.stringify(content || config || { text: title });

    const creditErr = await deductCredits(supabase, user.id, isDraft ? 0 : amountToDeduct);
    if (creditErr) {
      return NextResponse.json({ error: creditErr }, { status: 400 });
    }

    const corePayload = {
      user_id: user.id,
      template_id: template.id,
      recipient_name: recipientName,
      sender_name: senderName,
      message,
      image_url: imageUrl,
      audio_url: audioUrl,
      pin_code: pinCode || null,
      password: password || null,
      custom_slug: customSlugInput ? validateCustomSlug(customSlugInput).slug : null,
      has_watermark: hasWatermark,
      audio_type: resolvedAudioType || null,
      is_permanent: storageType === "permanent",
      hash_id: generateHashId(),
    };
    const optionalPayload = {
      unlock_at: unlockAt,
      template_cost: Number.isFinite(templateCost) ? templateCost : 0,
      storage_type: storageType,
      storage_cost: Number.isFinite(storageCost) ? storageCost : 0,
      expires_at: expiresAt,
      status,
      draft_expires_at: draftExpiresAt,
      view_count: 0,
    };
    const cardPayload = { ...corePayload, ...optionalPayload };
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .insert(cardPayload)
      .select("id, hash_id")
      .single();

    let createdCard = card;
    let creationError = cardError;
    if (
      creationError &&
      /schema cache|column .* does not exist|could not find the .* column/i.test(creationError.message) &&
      /(status|expires_at|draft_expires_at|is_draft|unlock_at|template_cost|storage_type|storage_cost|view_count)/i.test(creationError.message)
    ) {
      // Include the draft/published status flag in the reduced fallback payload;
      // otherwise the DB default ('published') would misplace saved drafts
      // into the published-cards list instead of /dashboard/drafts.
      const fallbackResult = await supabase
        .from("cards")
        .insert({ ...corePayload, status })
        .select("id, hash_id")
        .single();
      createdCard = fallbackResult.data;
      creationError = fallbackResult.error;
    }

    if (creationError || !createdCard) {
      if (creationError) console.error("Card creation database error:", creationError);
      await refundCredits(supabase, user.id, isDraft ? 0 : totalCost);
      throw new Error("Failed to create card");
    }
    cardId = createdCard.id;

    const sceneInserts = scenes.map((scene, index) => ({
      card_id: createdCard.id,
      scene_order: index,
      scene_type: scene.sceneType ?? scene.scene_type ?? (sceneFileUrls.has(index) ? "image" : "text"),
      content: JSON.stringify({
        title: scene.title ?? `Scene ${index + 1}`,
        body: scene.body ?? "",
        media_url: sceneFileUrls.get(index) ?? scene.mediaUrl ?? scene.media_url ?? "",
      }),
    }));

    if (sceneInserts.length > 0) {
      const { error: scenesError } = await supabase.from("card_scenes").insert(sceneInserts);
      if (scenesError) {
        const missingScenesTable =
          /schema cache|could not find the table .*card_scenes|relation .*card_scenes.*does not exist/i.test(
            scenesError.message,
          );
        if (!missingScenesTable) {
          console.error("Card scenes database error:", scenesError);
          throw new Error("Failed to create scenes");
        }
        console.warn("Card scenes table is unavailable; card created without scenes", scenesError.message);
      }
    }

    const redirectUrl = `/c/${createdCard.hash_id}`;
    return NextResponse.json({
      success: true,
      cardId: createdCard.id,
      hashId: createdCard.hash_id,
      redirectUrl,
      qrData: redirectUrl,
      status,
    }, { status: 200 });
  } catch (error: unknown) {
    if (cardId) await supabase.from("cards").delete().eq("id", cardId);
    if (uploadedPaths.length > 0) await supabase.storage.from("card-media").remove(uploadedPaths);
    await refundCredits(supabase, (await supabase.auth.getUser()).data.user?.id ?? "", totalCost);
    console.error("API Card Creation Exception:", error);
    const message = error instanceof Error ? error.message : "";
    const status = /duplicate key|custom_slug/i.test(message) ? 409 : 500;
    return NextResponse.json({ error: status === 409 ? "This Custom URL is already in use" : "ไม่สามารถสร้างการ์ดได้ กรุณาลองใหม่" }, { status });
  }
}

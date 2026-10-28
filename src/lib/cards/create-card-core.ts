import { createClient } from "@/lib/supabase/server";
import { generateHashId } from "@/lib/image-compression";
import { uploadCardMedia } from "@/lib/storage-server";
import {
  canUseAudio,
  getMediaLimit,
  hasUnlimitedQuota,
  resolveMediaTier,
  validateCustomSlug,
  type AudioType,
  type MediaKind,
} from "@/lib/tierRules";
import type {
  Card,
  CardStatus,
  DatabaseSceneType,
  StorageType,
  UserTier,
} from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

/** The SSR Supabase client returned by `createClient()` in `@/lib/supabase/server`. */
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export const ROYALTY_FREE_AUDIO = [
  "https://example.com/audio/birthday-song.mp3",
  "https://example.com/audio/celebration.mp3",
  "https://example.com/audio/romantic-piano.mp3",
  "https://example.com/audio/thank-you-music.mp3",
  "https://example.com/audio/gentle-apology.mp3",
];

export const FREE_DAILY_CARD_LIMIT = 5;

export interface CoreCardInputBase {
  templateId: string;
  recipientName: string;
  senderName: string;
  message: string;
  pinCode?: string | null;
  unlockAt?: string | null;
  imageFile?: File | null;
  audioFile?: File | null;
  audioSelection?: string | null;
  audioType?: AudioType | null;
  password?: string | null;
  customSlugInput?: string | null;
  hasWatermark?: boolean;
  templateCost?: number;
  storageType?: StorageType;
  storageCost?: number;
  customUrlCost?: number;
  /** Explicit premium payment intent: true = consume `premium_quota`, false = pay cash. Omitted = legacy auto-consume for priced premium templates. */
  usePremiumQuota?: boolean;
  /** Explicit storage payment intent: true = consume `permanent_quota`, false = pay cash. Omitted = legacy auto-consume when storage_cost is 0. */
  usePermanentQuota?: boolean;
  scenes?: Array<{
    scene_order: number;
    scene_type: DatabaseSceneType;
    content: string;
  }>;
}

export interface AuthenticatedUser {
  id: string;
}

export interface AuthenticatedProfile {
  id: string;
  tier: string;
  tier_raw:
    | "guest"
    | "free"
    | "starter"
    | "value"
    | "pro"
    | "god"
    | "vip";
  credits: number;
  permanent_quota: number;
  premium_quota: number;
  custom_url_quota: number;
  quota_expires_at?: string | null;
  /** Active purchased package tier (drives time-boxed media limits). */
  package_tier?: string | null;
  /** When the active package media entitlement lapses (NULL/<=NOW -> free). */
  package_expires_at?: string | null;
  [key: string]: unknown;
}

export type TierName =
  | "guest"
  | "free"
  | "starter"
  | "value"
  | "pro"
  | "god"
  | "vip";

export interface CreateCardContext {
  user: AuthenticatedUser;
  profile: AuthenticatedProfile;
  isDraft?: boolean;
  mode?: "action" | "api";
}

export interface CreateCardResult {
  success?: boolean;
  cardId?: string;
  hashId?: string;
  remainingCredits?: number;
  error?: string;
  status?: CardStatus;
  redirectUrl?: string;
  qrData?: string;
  refundOnError?: boolean;
}

export function isPremiumTier(tier: string): boolean {
  return (
    tier === "starter" ||
    tier === "value" ||
    tier === "pro" ||
    tier === "god" ||
    tier === "vip"
  );
}

export function getMediaMaxMB(tier: UserTier, kind: MediaKind): number {
  return getMediaLimit(tier, kind);
}

export function validateCardBasics(input: CoreCardInputBase): string | null {
  if (!input.recipientName || !input.senderName || !input.message || !input.templateId) {
    return "Recipient name, sender name, message, and template are required.";
  }
  if (input.pinCode && !/^\d{4,8}$/.test(input.pinCode)) {
    return "รหัส PIN ต้องมีความยาวระหว่าง 4 ถึง 8 หลัก";
  }
  if (input.storageType && input.storageType !== "14_days" && input.storageType !== "permanent") {
    return "Invalid storage type.";
  }
  if (input.password && !/^\d{4}$/.test(input.password)) {
    return "Password must be exactly 4 digits.";
  }
  return null;
}

export async function resolveTemplate(
  supabase: SupabaseServerClient,
  templateId: string,
): Promise<{ id: string; is_premium: boolean; price: number } | null> {
  const { data: template } = await supabase
    .from("templates")
    .select("id, is_premium, price")
    .or(`id.eq.${templateId},slug.eq.${templateId}`)
    .maybeSingle();
  if (template) return { id: template.id, is_premium: !!template.is_premium, price: Number(template.price ?? 0) };
  const { data: first } = await supabase
    .from("templates")
    .select("id, is_premium, price")
    .limit(1)
    .maybeSingle();
  return first ? { id: first.id, is_premium: !!first.is_premium, price: Number(first.price ?? 0) } : null;
}


/**
 * Atomically consume one `premium_quota` slot without ever letting the balance
 * fall below zero (equivalently `GREATEST(0, premium_quota - 1)`).
 *
 * Primary path is the `decrement_profile_quota` SECURITY DEFINER RPC (migration
 * 20260831000001) which performs the guarded, expression-based UPDATE in one
 * statement. It falls back to the legacy guarded direct UPDATE so card creation
 * still works if that migration has not been applied to the database yet.
 */
async function decrementPremiumQuota(userId: string, currentQuota: number): Promise<boolean> {
  try {
    const { data, error } = await privilegedDb().rpc("decrement_profile_quota", {
      p_user_id: userId,
      p_quota: "premium_quota",
    });
    if (!error) return data === true;
    console.error("decrement_profile_quota RPC failed, falling back to direct update:", error.message);
  } catch (e) {
    console.error("decrement_profile_quota RPC threw, falling back to direct update:", e);
  }
  // Legacy fallback (pre-migration): the guarded UPDATE only matches rows whose
  // current premium_quota is > 0, so it can never write a negative balance.
  const { data: row } = await privilegedDb()
    .from("profiles")
    .update({ premium_quota: currentQuota - 1 })
    .eq("id", userId)
    .gt("premium_quota", 0)
    .select("id")
    .maybeSingle();
  return !!row;
}


export async function computeAndApplyCharges(
  supabase: SupabaseServerClient,
  ctx: CreateCardContext,
  template: { id: string; is_premium: boolean; price: number },
  input: CoreCardInputBase,
): Promise<{ totalCost: number; error?: string; premiumQuotaConsumed?: boolean; permanentQuotaConsumed?: boolean; rollbackQuota?: () => Promise<void> }> {
  const { user, profile, isDraft } = ctx;
  const tier = profile.tier_raw;
  const storageType = input.storageType ?? "14_days";
  // Server-authoritative template price: trust the DB row, never the raw
  // client value. Floor the client cost at the real DB price so a tampered
  // (lower) client value can never undercharge.
  const templateCost = Math.max(
    Number.isFinite(input.templateCost) ? Number(input.templateCost) : 0,
    template.price,
  );
  const storageCost = Number.isFinite(input.storageCost) ? Number(input.storageCost) : 0;
  const customUrlCost = Number.isFinite(input.customUrlCost) ? Number(input.customUrlCost) : 0;

  let effectiveTemplateCost = templateCost;
  let effectiveStorageCost = storageCost;
  let effectiveCustomUrlCost = customUrlCost;
  let premiumQuotaConsumed = false;
  let permanentQuotaConsumed = false;

  // Payment intent for premium templates is sourced from the explicit client
  // flag (`usePremiumQuota`: true = use quota, false = pay cash) and falls back
  // to the legacy auto-consume rule (premium & priced template). This must NOT
  // gate on `templateCost > 0` alone: the client submits `template_cost = 0`
  // when the quota option is selected, so a priced premium template (or an
  // explicit quota request on a price-0 premium template) still has to decrement
  // `premium_quota` by 1.
  const wantsPremiumQuota =
    input.usePremiumQuota === true ||
    (input.usePremiumQuota === undefined && template.is_premium && template.price > 0);

  if (template.is_premium && wantsPremiumQuota && !hasUnlimitedQuota(tier, "premium_quota")) {
    const consumed = await decrementPremiumQuota(user.id, profile.premium_quota);
    if (consumed) {
      effectiveTemplateCost = 0;
      premiumQuotaConsumed = true;
    } else {
      // Quota expected/requested but no slots left -> bill the authoritative DB price.
      effectiveTemplateCost = template.price;
    }
  } else if (template.is_premium) {
    // Cash intent (explicit usePremiumQuota=false or a paid template_cost), or a
    // tier with an unlimited premium allowance (vip): bill the listed DB price
    // without touching the cumulative quota.
    effectiveTemplateCost = template.price;
  }

  // Same intent model for permanent storage (quota vs cash). Legacy clients that
  // omit the flag auto-consume when they submitted storage_cost = 0.
  const wantsPermanentQuota =
    input.usePermanentQuota === true ||
    (input.usePermanentQuota === undefined && storageCost <= 0);

  if (storageType === "permanent" && wantsPermanentQuota && tier !== "pro" && tier !== "vip" && tier !== "god") {
    const { data: consumed } = await privilegedDb()
      .from("profiles")
      .update({ permanent_quota: profile.permanent_quota - 1 })
      .eq("id", user.id)
      .gt("permanent_quota", 0)
      .select("id")
      .maybeSingle();
    if (consumed) {
      effectiveStorageCost = 0;
      permanentQuotaConsumed = true;
    } else effectiveStorageCost = 25;
  } else if (storageType === "permanent") {
    // Cash intent for permanent storage (or pro/vip/god bundling).
    effectiveStorageCost = tier === "pro" || tier === "vip" || tier === "god" ? 0 : 25;
  } else {
    effectiveStorageCost = storageCost;
  }

  if (input.customSlugInput && tier !== "pro" && tier !== "vip" && tier !== "god") {
    const { data: consumed } = await privilegedDb()
      .from("profiles")
      .update({ custom_url_quota: profile.custom_url_quota - 1 })
      .eq("id", user.id)
      .gt("custom_url_quota", 0)
      .select("id")
      .maybeSingle();
    if (consumed) effectiveCustomUrlCost = 0;
  } else if (input.customSlugInput) {
    effectiveCustomUrlCost = 0;
  }

  if (!isDraft) {
    const quotas = [
      input.customSlugInput && effectiveCustomUrlCost < 19 && !hasUnlimitedQuota(tier, "custom_url_quota") ? "custom_url_quota" : null,
    ].filter(Boolean) as string[];
    if (quotas.length > 0) {
      try {
        const { data: consumed, error: quotaError } = await supabase.rpc("consume_profile_quotas", {
          p_user_id: user.id,
          p_quotas: quotas,
        });
        if (quotaError || consumed !== true) {
          return { totalCost: 0, error: "Monthly entitlement quota exceeded" };
        }
      } catch {
        // RPC unavailable; fall back to direct updates
      }
    }
  }

  const totalCost = effectiveTemplateCost + effectiveStorageCost + effectiveCustomUrlCost;

  if (!isDraft && profile.credits < totalCost) {
    return { totalCost, error: "Insufficient credits" };
  }

  return { totalCost, premiumQuotaConsumed, permanentQuotaConsumed };
}

/**
 * Server-side financial mutations (credits & card-creation quotas) on
 * public.profiles are intentionally denied to the client role:
 * - migration 20260823000005 REVOKE UPDATE ... + column-only GRANTs
 * - migrations 20260825000003 / 20260826000004 grant increment_credits()
 *   EXECUTE solely to service_role
 *
 * Therefore these writes MUST go through the service-role admin client.
 * This bypasses RLS safely because (SEC-1/SEC-2):
 * - every caller has already authenticated the user server-side and checked
 *   ban status before reaching this code, and
 * - every mutated amount is computed from database facts above, never taken
 *   from raw client input.
 */
function privilegedDb() {
  return createAdminClient();
}

/** Map DB privilege/RLS failures to a user-safe message (never leak SQL). */
export function sanitizeProfileMutationError(message: string): string {
  return /permission denied|row-level|42501/i.test(message)
    ? "ไม่สามารถบันทึกเครดิตหรือโควตาการ์ดของคุณได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง"
    : message;
}

export async function deductCredits(supabase: SupabaseServerClient, userId: string, amount: number): Promise<string | null> {
  if (amount <= 0) return null;
  const adminDb = privilegedDb();
  const { error } = await adminDb.rpc("increment_credits", {
    user_id: userId,
    amount: -amount,
  });
  if (!error) return null;
  // Best-effort fallback retained for environments whose SQL grants differ.
  const { data: currentProfile } = await adminDb
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();
  if (!currentProfile) return "Failed to check credits";
  if (currentProfile.credits < amount) return "Insufficient credits";
  const { error: updErr } = await adminDb
    .from("profiles")
    .update({ credits: currentProfile.credits - amount })
    .eq("id", userId);
  if (!updErr?.message) return null;
  console.error("deductCredits fallback failed:", updErr.message);
  return sanitizeProfileMutationError(updErr.message);
}

export async function refundCredits(supabase: SupabaseServerClient, userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  try {
    // increment_credits() EXECUTE is service_role-only since migration
    // 20260826000004 — refunds are financial mutations, so they run elevated.
    const adminDb = privilegedDb();
    await adminDb.rpc("increment_credits", { user_id: userId, amount });
  } catch {
    // swallow; best-effort refund
  }
}

export async function checkFreeDailyLimit(
  supabase: SupabaseServerClient,
  userId: string,
  tier: string,
): Promise<string | null> {
  if (isPremiumTier(tier)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: todayCards, error } = await supabase
    .from("cards")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", today.toISOString());
  if (error) return "Failed to check rate limit.";
  if (todayCards && todayCards.length >= FREE_DAILY_CARD_LIMIT) {
    return `Daily limit of ${FREE_DAILY_CARD_LIMIT} free cards reached.`;
  }
  return null;
}

export function resolveAudioUrl(
  audioFile: File | null | undefined,
  audioSelection: string | null | undefined,
): { url: string | null; isFile: boolean } {
  if (audioFile && audioFile.size > 0) return { url: null, isFile: true };
  if (audioSelection && ROYALTY_FREE_AUDIO.includes(audioSelection)) {
    return { url: audioSelection, isFile: false };
  }
  return { url: null, isFile: false };
}

export async function createCardCore(
  input: CoreCardInputBase,
  ctx: CreateCardContext,
): Promise<CreateCardResult> {
  const supabase = await createClient();
  const { user, profile, isDraft = false } = ctx;
  const tier = profile.tier_raw;
  // Media entitlements are time-boxed by the ACTIVE package window: when the
  // package has lapsed (package_expires_at <= NOW() / NULL) the limits fall
  // back to free-tier defaults, while accumulated quotas are untouched.
  const mediaTier = resolveMediaTier({
    tier,
    packageTier: profile.package_tier,
    packageExpiresAt: profile.package_expires_at,
  });

  const storageType: StorageType = input.storageType ?? "14_days";
  const hasWatermark = input.hasWatermark !== false;
  const resolvedAudioType: AudioType | null | undefined =
    input.audioType ??
    (input.audioFile && input.audioFile.size > 0
      ? input.audioFile.type === "video/mp4"
        ? "video"
        : "mp3"
      : input.audioSelection
      ? "youtube"
      : undefined);

  const basicError = validateCardBasics(input);
  if (basicError) return { error: basicError };

  if (input.customSlugInput) {
    const validation = validateCustomSlug(input.customSlugInput);
    if (validation.error) return { error: validation.error };
  }
  if (resolvedAudioType && !canUseAudio(tier, resolvedAudioType)) {
    return { error: "This audio type is not available for your tier." };
  }

  const template = await resolveTemplate(supabase, input.templateId);
  if (!template) return { error: "Template not found or no templates available." };
  if (template.is_premium && tier === "guest") {
    return { error: "Premium templates are not available for guest accounts." };
  }
  if (storageType === "permanent" && tier === "guest") {
    return { error: "Permanent storage is not available for guest accounts." };
  }

  const rateLimitErr = await checkFreeDailyLimit(supabase, user.id, tier);
  if (rateLimitErr) return { error: rateLimitErr };

  const charges = await computeAndApplyCharges(supabase, ctx, template, input);
  if (charges.error) return { error: charges.error };
  const totalCost = charges.totalCost;

  const creditErr = await deductCredits(supabase, user.id, isDraft ? 0 : totalCost);
  if (creditErr) return { error: creditErr };

  const hashId = generateHashId();
  const expiryDate = isPremiumTier(tier)
    ? null
    : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
  const unlockAt = input.unlockAt ? new Date(input.unlockAt).toISOString() : null;
  const expiresAt =
    storageType === "14_days"
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      : null;
  const status: CardStatus = isDraft ? "draft" : "published";
  const draftExpiresAt = isDraft
    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const coreInsert = {
    user_id: user.id,
    template_id: template.id,
    recipient_name: input.recipientName,
    sender_name: input.senderName,
    message: input.message,
    image_url: null,
    audio_url: null,
    pin_code: input.pinCode || null,
    hash_id: hashId,
    expiry_date: expiryDate,
    unlock_at: unlockAt,
    view_count: 0,
    template_cost: charges.totalCost >= 0 && !input.templateCost ? 0 : Number(input.templateCost ?? 0),
    storage_type: storageType,
    storage_cost: Number(input.storageCost ?? 0),
    expires_at: expiresAt,
    is_permanent: storageType === "permanent",
    custom_slug: input.customSlugInput ? validateCustomSlug(input.customSlugInput).slug : null,
    has_watermark: hasWatermark,
    audio_type: resolvedAudioType ?? null,
    password: input.password || null,
    status,
    draft_expires_at: draftExpiresAt,
  };

  const rollback = async (cardId?: string) => {
    if (cardId) {
      try {
        await supabase.from("card_scenes").delete().eq("card_id", cardId);
      } catch { /* ignore */ }
      try {
        await supabase.from("cards").delete().eq("id", cardId);
      } catch { /* ignore */ }
    }
    await refundCredits(supabase, user.id, isDraft ? 0 : totalCost);
  };

  const { data: cardData, error: insertError } = await supabase
    .from("cards")
    .insert(coreInsert)
    .select("id, hash_id")
    .single();
  if (insertError || !cardData) {
    await refundCredits(supabase, user.id, isDraft ? 0 : totalCost);
    return { error: insertError?.message ?? "Failed to create card." };
  }

  let imageUrl: string | null = null;
  let audioUrl: string | null = null;

  if (input.imageFile && input.imageFile.size > 0) {
    const imageLimitMB = getMediaLimit(mediaTier, "image");
    if (input.imageFile.size > imageLimitMB * 1024 * 1024) {
      await rollback(cardData.id);
      return {
        error: `Image size exceeds ${imageLimitMB}MB limit.`,
      };
    }
    const { url, error: uploadError } = await uploadCardMedia(
      input.imageFile,
      user.id,
      cardData.id,
    );
    if (uploadError) {
      await rollback(cardData.id);
      return { error: uploadError };
    }
    imageUrl = url;
  }

  if (input.audioFile && input.audioFile.size > 0) {
    // MP4 attachments are uploaded through the audio field and resolve to the
    // "video" audio type, so they must be validated against the video limit.
    const mediaKind: MediaKind =
      resolvedAudioType === "video" ? "video" : "audio";
    const mediaLimitMB = getMediaLimit(mediaTier, mediaKind);
    if (input.audioFile.size > mediaLimitMB * 1024 * 1024) {
      await rollback(cardData.id);
      return {
        error:
          mediaKind === "video"
            ? `Video size exceeds ${mediaLimitMB}MB limit.`
            : `Audio size exceeds ${mediaLimitMB}MB limit.`,
      };
    }
    const { url, error: uploadError } = await uploadCardMedia(
      input.audioFile,
      user.id,
      cardData.id,
    );
    if (uploadError) {
      await rollback(cardData.id);
      return { error: uploadError };
    }
    audioUrl = url;
  } else if (input.audioSelection && ROYALTY_FREE_AUDIO.includes(input.audioSelection)) {
    audioUrl = input.audioSelection;
  }

  if (imageUrl || audioUrl) {
    const { error: updErr } = await supabase
      .from("cards")
      .update({ image_url: imageUrl, audio_url: audioUrl })
      .eq("id", cardData.id);
    if (updErr) {
      await rollback(cardData.id);
      return { error: `Failed to update card with media: ${updErr.message}` };
    }
  }

  if (input.scenes && input.scenes.length > 0) {
    try {
      const sceneInserts = input.scenes.map((scene) => ({
        card_id: cardData.id,
        scene_order: scene.scene_order,
        scene_type: scene.scene_type,
        content: scene.content,
      }));
      const { error: scenesError } = await supabase
        .from("card_scenes")
        .insert(sceneInserts);
      if (scenesError) {
        const missingTable =
          /could not find the table|relation .* does not exist/i.test(
            scenesError.message,
          );
        if (!missingTable) {
          await rollback(cardData.id);
          return { error: `Failed to create scenes: ${scenesError.message}` };
        }
      }
    } catch {
      await rollback(cardData.id);
      return { error: "Invalid scenes data format." };
    }
  }

  const remainingCredits =
    (profile.credits ?? 0) - (isDraft ? 0 : totalCost);

  return {
    success: true,
    cardId: cardData.id,
    hashId,
    remainingCredits,
    status,
    redirectUrl: `/c/${hashId}`,
    qrData: `/c/${hashId}`,
  };
}

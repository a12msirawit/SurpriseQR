import type { StorageType, UserTier } from "@/types/database";

export type AudioType = "youtube" | "mp3" | "video";
export type QuotaName = "custom_url_quota" | "premium_quota" | "permanent_quota";
export type MediaKind = "image" | "audio" | "video";

export const TIER_RULES = {
  guest: { regularCards: 2, permanentCards: 0, premiumCards: 0, customUrls: 0, audio: ["youtube", "mp3"] },
  free: { regularCards: 5, permanentCards: 0, premiumCards: 0, customUrls: 0, audio: ["youtube", "mp3", "video"] },
  starter: { regularCards: Infinity, permanentCards: 2, premiumCards: 1, customUrls: 2, audio: ["youtube", "mp3", "video"] },
  value: { regularCards: Infinity, permanentCards: 6, premiumCards: 3, customUrls: 6, audio: ["youtube", "mp3", "video"] },
  pro: { regularCards: Infinity, permanentCards: 8, premiumCards: 6, customUrls: 8, audio: ["youtube", "mp3", "video"] },
  god: { regularCards: Infinity, permanentCards: Infinity, premiumCards: 10, customUrls: Infinity, audio: ["youtube", "mp3", "video"] },
  vip: { regularCards: Infinity, permanentCards: Infinity, premiumCards: Infinity, customUrls: Infinity, audio: ["youtube", "mp3", "video"] },
} as const;

export const TIER_RANK: Record<UserTier, number> = {
  guest: 0,
  free: 0,
  starter: 1,
  value: 2,
  pro: 3,
  god: 4,
  vip: 5,
};

export const MEDIA_LIMITS: Record<UserTier, { image: number; audio: number; video: number; priority: boolean; total: number }> = {
  guest: { image: 150, audio: 150, video: 150, priority: false, total: 150 },
  free: { image: 150, audio: 150, video: 150, priority: false, total: 150 },
  starter: { image: 200, audio: 200, video: 200, priority: false, total: 200 },
  value: { image: 300, audio: 300, video: 300, priority: false, total: 300 },
  pro: { image: 500, audio: 500, video: 500, priority: true, total: 500 },
  god: { image: 1024, audio: 1024, video: 1024, priority: true, total: 1024 },
  vip: { image: 1024, audio: 1024, video: 1024, priority: true, total: 1024 },
};

/**
 * Entitlements for cards using a paid or premium template (Pay-as-you-go / Quota).
 * Automatically boosts upload allowances even on Free/Starter tiers:
 * - Combined media quota up to 300 MB per template
 */
export const PAID_TEMPLATE_MEDIA_LIMITS: { image: number; audio: number; video: number; priority: boolean; total: number } = {
  image: 300,
  audio: 300,
  video: 300,
  priority: false,
  total: 300,
};

const RESERVED_SLUGS = new Set(["admin", "login", "register", "api", "s", "payments"]);

export function getTierRules(tier: UserTier) {
  return TIER_RULES[tier] ?? TIER_RULES.free;
}

export function getTierRank(tier: UserTier): number {
  return TIER_RANK[tier] ?? 0;
}

export function getMediaLimit(
  tier: UserTier,
  kind: MediaKind,
  options?: { isPaidTemplate?: boolean; isPremiumTemplate?: boolean }
): number {
  const isPaidOrPremium = options?.isPaidTemplate ?? options?.isPremiumTemplate ?? false;
  if (isPaidOrPremium) {
    const tierLimit = MEDIA_LIMITS[tier]?.[kind] ?? MEDIA_LIMITS.free[kind];
    const paidTemplateLimit = PAID_TEMPLATE_MEDIA_LIMITS[kind];
    return Math.max(tierLimit, paidTemplateLimit);
  }
  const limits = MEDIA_LIMITS[tier] ?? MEDIA_LIMITS.free;
  return limits[kind];
}

export function getTotalMediaLimit(
  tier: UserTier,
  options?: { isPaidTemplate?: boolean; isPremiumTemplate?: boolean }
): number {
  const isPaidOrPremium = options?.isPaidTemplate ?? options?.isPremiumTemplate ?? false;
  if (isPaidOrPremium) {
    const tierLimit = MEDIA_LIMITS[tier]?.total ?? MEDIA_LIMITS.free.total;
    const paidTemplateLimit = PAID_TEMPLATE_MEDIA_LIMITS.total;
    return Math.max(tierLimit, paidTemplateLimit);
  }
  const limits = MEDIA_LIMITS[tier] ?? MEDIA_LIMITS.free;
  return limits.total;
}

export function hasPriorityProcessing(tier: UserTier): boolean {
  return (MEDIA_LIMITS[tier] ?? MEDIA_LIMITS.free).priority;
}

const PAID_TIERS: readonly UserTier[] = ["starter", "value", "pro", "god", "vip"];

export function isPaidTier(tier: string | null | undefined): tier is UserTier {
  return !!tier && (PAID_TIERS as readonly string[]).includes(tier);
}

/** PIN must be exactly 4 digits. Empty string is treated as "no PIN". */
export function isValidPin(pin: string | null | undefined): boolean {
  if (!pin) return true;
  return /^\d{4}$/.test(pin);
}

function normalizeTier(tier: string | null | undefined): UserTier {
  if (
    tier === "guest" ||
    tier === "free" ||
    tier === "starter" ||
    tier === "value" ||
    tier === "pro" ||
    tier === "god" ||
    tier === "vip"
  ) {
    return tier;
  }
  return "free";
}

/**
 * Resolve the tier that governs TIME-BOXED media entitlements (image/audio/video
 * upload sizes + priority processing).
 *
 * Package quota balances (permanent_quota / premium_quota / custom_url_quota)
 * are retained through a 7-day grace period, then cleared by expiry cleanup.
 * Media limits are tied to the ACTIVE
 * `package_tier`:
 *   - if `package_expires_at` is set and in the future -> the package's tier;
 *   - an expired or NULL `package_expires_at` falls back to FREE tier limits
 *     (unused balances stay available only through the renewal grace period);
 *   - `vip` is a permanent account-level tier (granted, not a time-boxed
 *     purchase) and always keeps its media entitlement.
 */
export function resolveMediaTier(input: {
  tier?: string | null;
  packageTier?: string | null;
  packageExpiresAt?: string | null;
}): UserTier {
  const now = Date.now();
  if (isPaidTier(input.packageTier)) {
    const expiresAt = input.packageExpiresAt
      ? new Date(input.packageExpiresAt).getTime()
      : NaN;
    if (Number.isFinite(expiresAt) && expiresAt > now) {
      return normalizeTier(input.packageTier);
    }
  }
  // VIP is a permanent top-tier grant that is never lapsed for media.
  if (input.tier === "vip") return "vip";
  return "free";
}

export function slugifyCustomUrl(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function validateCustomSlug(value: string) {
  const slug = slugifyCustomUrl(value);
  if (!slug) return { slug, error: "Custom URL is required" };
  if (RESERVED_SLUGS.has(slug)) return { slug, error: "This Custom URL is reserved" };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { slug, error: "Custom URL format is invalid" };
  return { slug };
}

export function canUsePermanentStorage(tier: UserTier, permanentUsed: number) {
  return permanentUsed < getTierRules(tier).permanentCards;
}

export function canUseAudio(
  tier: UserTier,
  audioType: AudioType,
  options?: { isPaidTemplate?: boolean; isPremiumTemplate?: boolean }
) {
  const isPaidOrPremium = options?.isPaidTemplate ?? options?.isPremiumTemplate ?? false;
  if (isPaidOrPremium && audioType === "video") return true;
  return (getTierRules(tier).audio as readonly string[]).includes(audioType);
}

export function quotaForTier(tier: UserTier, quota: QuotaName) {
  const rule = getTierRules(tier);
  return quota === "custom_url_quota" ? rule.customUrls : quota === "premium_quota" ? rule.premiumCards : rule.permanentCards;
}

export function hasUnlimitedQuota(tier: UserTier, quota: QuotaName) {
  return quotaForTier(tier, quota) === Infinity;
}

export function isStorageType(value: string): value is StorageType {
  return value === "14_days" || value === "permanent";
}

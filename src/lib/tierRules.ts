import type { StorageType, UserTier } from "@/types/database";

export type AudioType = "youtube" | "mp3" | "video";
export type QuotaName = "custom_url_quota" | "premium_quota" | "permanent_quota";
export type MediaKind = "image" | "audio" | "video";

export const TIER_RULES = {
  guest: { regularCards: 2, permanentCards: 0, premiumCards: 0, customUrls: 0, audio: ["youtube"] },
  free: { regularCards: 5, permanentCards: 0, premiumCards: 0, customUrls: 0, audio: ["youtube", "mp3"] },
  starter: { regularCards: Infinity, permanentCards: 2, premiumCards: 1, customUrls: 2, audio: ["youtube", "mp3"] },
  value: { regularCards: Infinity, permanentCards: 6, premiumCards: 3, customUrls: 6, audio: ["youtube", "mp3"] },
  pro: { regularCards: Infinity, permanentCards: 8, premiumCards: 6, customUrls: 8, audio: ["youtube", "mp3"] },
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

export const MEDIA_LIMITS: Record<UserTier, { image: number; audio: number; video: number; priority: boolean }> = {
  guest: { image: 5, audio: 5, video: 10, priority: false },
  free: { image: 5, audio: 5, video: 10, priority: false },
  starter: { image: 5, audio: 5, video: 10, priority: false },
  value: { image: 10, audio: 10, video: 35, priority: false },
  pro: { image: 10, audio: 20, video: 50, priority: true },
  god: { image: 15, audio: 25, video: 100, priority: true },
  vip: { image: 15, audio: 25, video: 100, priority: true },
};

const RESERVED_SLUGS = new Set(["admin", "login", "register", "api", "s", "payments"]);

export function getTierRules(tier: UserTier) {
  return TIER_RULES[tier] ?? TIER_RULES.free;
}

export function getTierRank(tier: UserTier): number {
  return TIER_RANK[tier] ?? 0;
}

export function getMediaLimit(tier: UserTier, kind: MediaKind): number {
  const limits = MEDIA_LIMITS[tier] ?? MEDIA_LIMITS.free;
  return limits[kind];
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
 * Cumulative quota balances (permanent_quota / premium_quota / custom_url_quota)
 * are permanent and are NOT touched here. Media limits are tied to the ACTIVE
 * `package_tier`:
 *   - if `package_expires_at` is set and in the future -> the package's tier;
 *   - an expired or NULL `package_expires_at` falls back to FREE tier limits
 *     (while the user keeps every accumulated quota balance);
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

export function canUseAudio(tier: UserTier, audioType: AudioType) {
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

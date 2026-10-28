import type { UserTier } from "@/types/database";

export function getExpirationLabel(
  tier: UserTier,
  expiryDate: string | null
): string {
  if (!expiryDate) return "ถาวร";

  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) return "หมดอายุ";
  return `หมดอายุใน ${days} วัน`;
}

export function getCardSharePath(hashId: string): string {
  return `/c/${hashId}`;
}

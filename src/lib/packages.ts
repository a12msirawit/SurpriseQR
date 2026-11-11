import type { PackageType, UserTier } from "@/types/database";

/**
 * Central package catalogue — the single source of truth for the pricing
 * cards rendered by `PaymentModal` (embedded on the /topup page) and
 * `TopupForm`. The `id` values are the canonical codes persisted as
 * `payments.package_type` and recognized by `approve_payment_transaction`
 * (supabase/migrations/20260828000001_add_god_pack_and_update_package_specs.sql).
 */
export interface PricingPackage {
  /** Canonical package code, e.g. "god_269". */
  id: PackageType;
  /** Short tier key for tier-aware UI logic (visibility / current-tier badge). */
  tierKey: "starter" | "value" | "pro" | "god";
  name: string;
  price: number;
  badge: string;
  /** Renders the card with the premium highlight treatment. */
  highlighted?: boolean;
  features: string[];
}

/** Price lookup shared with the slip-validation API route. */
export const PACKAGE_PRICES: Record<PackageType, number> = {
  starter_69: 69,
  value_119: 119,
  pro_199: 199,
  god_269: 269,
};

export const PACKAGE_TIER_RANK: Record<PricingPackage["tierKey"], number> = {
  starter: 1,
  value: 2,
  pro: 3,
  god: 4,
};

export const PRICING_PACKAGES: readonly PricingPackage[] = [
  {
    id: "starter_69",
    tierKey: "starter",
    name: "Starter Pack",
    price: 69,
    badge: "เริ่มต้น",
    features: [
      "จัดเก็บถาวร + Custom URL 2 สิทธิ์",
      "เทมเพลตพรีเมียม 1 เทมเพลต",
      "รูปภาพ 5 MB | MP3 5 MB | วิดีโอ 10 MB ต่อไฟล์",
    ],
  },
  {
    id: "value_119",
    tierKey: "value",
    name: "Value Pack",
    price: 119,
    badge: "ยอดนิยม",
    features: [
      "จัดเก็บถาวร + Custom URL 6 สิทธิ์",
      "เทมเพลตพรีเมียม 3 เทมเพลต",
      "รูปภาพ 10 MB | MP3 10 MB | วิดีโอ 35 MB ต่อไฟล์",
    ],
  },
  {
    id: "pro_199",
    tierKey: "pro",
    name: "Pro Pack",
    price: 199,
    badge: "แนะนำ",
    features: [
      "จัดเก็บถาวร + Custom URL 8 สิทธิ์",
      "เทมเพลตพรีเมียม 6 เทมเพลต",
      "สิทธิ์ประมวลผลและอัปโหลด Priority",
      "รูปภาพ 10 MB | MP3 20 MB | วิดีโอ 50 MB ต่อไฟล์",
    ],
  },
  {
    id: "god_269",
    tierKey: "god",
    name: "God Pack",
    price: 269,
    badge: "คุ้มค่าที่สุด",
    highlighted: true,
    features: [
      "จัดเก็บถาวร + Custom URL 10 สิทธิ์",
      "เทมเพลตพรีเมียม 10 เทมเพลต",
      "สิทธิ์ประมวลผลและอัปโหลด Priority",
      "รูปภาพ 15 MB | MP3 25 MB | วิดีโอ 100 MB ต่อไฟล์",
    ],
  },
];

/**
 * Every package starts a fresh 30-day subscription period.
 */
export const RENEWAL_FEATURE = "ใช้งาน 30 วัน (ไม่ทบวัน)";

/**
 * Kept as a named export for older callers; every package now has the same term.
 */
export const GOD_STARTER_FEATURE = RENEWAL_FEATURE;

/** Footnote rendered beneath the package grid. */
export const STACKING_FOOTNOTE =
  "อัปเกรดเป็นแพ็กที่สูงกว่าได้ทันทีและเริ่มรอบ 30 วันใหม่ ต่อแพ็กเดิมได้เมื่อเหลือไม่เกิน 7 วัน ส่วนการลดแพ็กทำได้หลังแพ็กปัจจุบันหมดอายุ โดยสิทธิ์คงเหลืออยู่ต่อได้อีก 7 วัน";

/**
 * Tier-aware feature lines for a package card.
 *
 * Every package has the same fresh 30-day term, regardless of the current plan.
 */
export function getPackageFeatures(pkg: PricingPackage, currentTier?: UserTier | null): string[] {
  void currentTier;
  return [RENEWAL_FEATURE, ...pkg.features];
}

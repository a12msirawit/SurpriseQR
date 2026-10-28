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
 * Renewal line shown on every package card: each purchase stacks +30 days,
 * hard-capped server-side so the total window never exceeds 120 days.
 */
export const RENEWAL_FEATURE = "⚡ ต่ออายุ +30 วัน (สะสมสูงสุด 120 วัน)";

/**
 * Starter-card line shown only to ACTIVE God users: buying Starter while on
 * the God tier keeps the God window unchanged (+0 days) and only grants the
 * additional permanent/custom/premium quota adds.
 */
export const GOD_STARTER_FEATURE = "📦 เพิ่มสิทธิ์ถาวร & เทมเพลต (+0 วันสำหรับ God Tier)";

/** Footnote rendered beneath the package grid. */
export const STACKING_FOOTNOTE =
  "📌 ทุกแพ็กเกจสะสมวันใช้งานได้สูงสุด 120วัน | สิทธิ์ God Pack สามารถทบวันได้เมื่อซื้อแพ็กเกจ 119฿ ขึ้นไป";

/**
 * Tier-aware feature lines for a package card.
 *
 * Every package prepends the +30-day renewal line, EXCEPT Starter when the
 * viewer is an active God user — God buying Starter does not extend the
 * window (mirrors `approve_payment_transaction` / `process_package_payment`
 * stacking rules from migration 20260828000002).
 */
export function getPackageFeatures(pkg: PricingPackage, currentTier?: UserTier | null): string[] {
  const renewalLine =
    currentTier === "god" && pkg.id === "starter_69" ? GOD_STARTER_FEATURE : RENEWAL_FEATURE;
  return [renewalLine, ...pkg.features];
}

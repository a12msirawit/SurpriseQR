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

export const SINGLE_UPGRADE = {
  price: 25,
  name: "อัปเกรดรายใบ (Single Upgrade)",
  features: [
    "สิทธิ์จัดเก็บถาวร 1 ใบ",
    "ตั้งชื่อ Custom URL ได้ 1 ใบ",
  ],
};

export const PRICING_PACKAGES: readonly PricingPackage[] = [
  {
    id: "starter_69",
    tierKey: "starter",
    name: "Starter Pack",
    price: 69,
    badge: "เริ่มต้น",
    features: [
      "สิทธิ์จัดเก็บถาวร และ ตั้งชื่อ Custom URL + 2 สิทธิ์",
      "สิทธิ์ปลดล็อกใช้งานเทมเพลตพรีเมียม (แบบเสียเงิน) ฟรี 1 เทมเพลต",
      "โควตาและสิทธิ์ไม่มีวันหมดอายุ เก็บไว้ใช้ได้ตลอด",
      "โควตาสื่อ: รวมสูงสุด 200 MB ต่อเทมเพลต (ใช้ตามอายุการ์ด)",
    ],
  },
  {
    id: "value_119",
    tierKey: "value",
    name: "Value Pack",
    price: 119,
    badge: "ยอดนิยม",
    features: [
      "สิทธิ์จัดเก็บถาวร และ Custom URL + 6 สิทธิ์",
      "สิทธิ์ปลดล็อกใช้งานเทมเพลตพรีเมียม (แบบเสียเงิน) ฟรี 3 เทมเพลต",
      "โควตาและสิทธิ์ไม่มีวันหมดอายุ ใช้ไม่หมดเก็บไว้ใช้ต่อได้",
      "โควตาสื่อ: รวมสูงสุด 300 MB ต่อเทมเพลต (ใช้ตามอายุการ์ด)",
    ],
  },
  {
    id: "pro_199",
    tierKey: "pro",
    name: "Pro Pack",
    price: 199,
    badge: "แนะนำ",
    features: [
      "สิทธิ์จัดเก็บถาวร และ ตั้งชื่อ Custom URL + 8 สิทธิ์",
      "สิทธิ์ปลดล็อกใช้งานเทมเพลตพรีเมียม (แบบเสียเงิน) ฟรี 6 เทมเพลต",
      "ได้รับสิทธิ์ประมวลผลและอัปโหลดสื่อความเร็วสูง (Priority)",
      "โควตาสื่อ: รวมสูงสุด 500 MB ต่อเทมเพลต (ใช้ตามอายุการ์ด)",
    ],
  },
  {
    id: "god_269",
    tierKey: "god",
    name: "God Pack",
    price: 269,
    badge: "เหมาจ่ายคุ้มที่สุด",
    highlighted: true,
    features: [
      "สิทธิ์จัดเก็บถาวร ไม่จำกัดจำนวนการ์ด",
      "ตั้งชื่อ Custom URL ได้ ไม่อั้นทุกใบ",
      "สิทธิ์ปลดล็อกใช้งานเทมเพลตพรีเมียม (แบบเสียเงิน) ฟรี 10 เทมเพลต",
      "ได้รับสิทธิ์ประมวลผลและอัปโหลดสื่อความเร็วสูง (Priority)",
      "โควตาสื่อ: รวมสูงสุด 1 GB ต่อเทมเพลต (ใช้ตามอายุการ์ด)",
    ],
  },
];

/**
 * Free Tier specifications
 */
export const FREE_TIER_SPECS = {
  freeTemplate: {
    storage: "เก็บฟรี 14 วัน ไม่มีค่าใช้จ่าย (จ่ายเก็บถาวร 25 บาท + ตั้ง URL)",
    mediaLimitMB: 150,
    mediaDescription: "อัปโหลดรูป, เพลง MP3 และวิดีโอ รวมสูงสุด 150 MB ต่อเทมเพลต",
  },
  premiumTemplate: {
    storage: "เก็บฟรี 14 วัน ไม่มีค่าใช้จ่าย (จ่ายเก็บถาวร 25 บาท + ตั้ง URL)",
    mediaLimitMB: 300,
    mediaDescription: "อัปโหลดรูป, เพลง MP3 และวิดีโอ รวมสูงสุด 300 MB ต่อเทมเพลต",
  },
};

/**
 * Default term notice
 */
export const RENEWAL_FEATURE = "โควตาและสิทธิ์ไม่มีวันหมดอายุ เก็บไว้ใช้ได้ตลอด";

/**
 * Kept as a named export for older callers
 */
export const GOD_STARTER_FEATURE = RENEWAL_FEATURE;

/** Footnote rendered beneath the package grid. */
export const STACKING_FOOTNOTE =
  "โควตาและสิทธิ์ทั้งหมดไม่มีวันหมดอายุ สามารถสะสมและเก็บไว้ใช้ต่อได้ตลอด | โควตาสื่อจะใช้งานได้ตามอายุของการ์ดใบนั้นๆ | อัปเกรดรายใบ (Single Upgrade 25 บาท): สิทธิ์จัดเก็บถาวร 1 ใบ + ตั้งชื่อ Custom URL 1 ใบ";

/**
 * Tier-aware feature lines for a package card.
 */
export function getPackageFeatures(pkg: PricingPackage, currentTier?: UserTier | null): string[] {
  void currentTier;
  return pkg.features;
}

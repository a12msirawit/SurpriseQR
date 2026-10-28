export const TEMPLATE_CATEGORIES = [
  "birthday",
  "love",
  "thanks",
  "sorry",
  "event",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  birthday: "วันเกิด",
  love: "ความรัก/วาเลนไทน์",
  thanks: "เทศกาล",
  sorry: "ขอโทษ",
  event: "วันครบรอบ",
};

export interface CategoryMeta {
  id: "all" | "free" | "premium" | TemplateCategory;
  label: string;
}

export const CATEGORY_META: CategoryMeta[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "birthday", label: "วันเกิด" },
  { id: "love", label: "ความรัก/วาเลนไทน์" },
  { id: "thanks", label: "เทศกาล" },
  { id: "free", label: "ฟรี" },
  { id: "premium", label: "พรีเมียม" },
];

export function isValidTemplateCategory(value: unknown): value is TemplateCategory {
  return typeof value === "string" && (TEMPLATE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Category options for the Admin template create/edit forms.
 * Mirrors the Dashboard category tabs exactly (birthday/love/thanks) so a
 * template assigned here maps cleanly onto the Dashboard filters.
 */
export const ADMIN_CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = [
  { value: "birthday", label: "วันเกิด" },
  { value: "love", label: "ความรัก/วาเลนไทน์" },
  { value: "thanks", label: "เทศกาล" },
];

/**
 * Normalizes a category value to one of the Admin category option `value`s,
 * lowercased, so the internal value (e.g. "love") is always submitted to the
 * database instead of a Thai label or a mismatched case (e.g. "Love").
 * Unknown/blank values fall back to the first option ("birthday").
 */
export function normalizeAdminCategory(value?: string | null): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  const options = ADMIN_CATEGORY_OPTIONS ?? [];
  const match = options.find((option) => option.value.toLowerCase() === normalized);
  return match ? match.value : (options[0]?.value ?? "birthday");
}

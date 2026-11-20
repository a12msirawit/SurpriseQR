import type { Card } from "@/types/database";

/**
 * Production template identifiers (canonical slug, legacy slug and the seeded
 * DB row UUID).
 */
const ANNIVERSARY_SURPRISE_TEMPLATE_IDS = new Set([
  "anniversary-surprise",
  "anniversary",
  // Production Anniversary Surprise row UUID (seed migration 20260829000005):
  "10000000-0000-4000-8000-000000000006",
]);

const CANDLES_TEMPLATE_IDS = new Set([
  "candles",
  // Production Blow Candles row UUID (seed migration 20261103000001):
  "10000000-0000-4000-8000-000000000007",
]);

const STORYLINE_TEMPLATE_IDS = new Set(["storyline", "story-line", "10000000-0000-4000-8000-000000000008"]);

const RETRO_Y2K_TEMPLATE_IDS = new Set([
  "retro-y2k",
  "retro",
  "y2k",
  "windows-98",
  "10000000-0000-4000-8000-000000000009",
]);

const VINTAGE_WAX_SEAL_TEMPLATE_IDS = new Set([
  "vintage-wax-seal",
  "wax-seal",
  "vintage",
  "parchment",
  "10000000-0000-4000-8000-000000000010",
]);

const MIDNIGHT_CINEMA_TEMPLATE_IDS = new Set([
  "midnight-cinema",
  "cinema",
  "35mm",
  "midnight",
  "film",
  "10000000-0000-4000-8000-000000000011",
]);

const STARLIGHT_MEMORIES_TEMPLATE_IDS = new Set([
  "starlight-memories",
  "starlight",
  "stars",
  "10000000-0000-4000-8000-000000000012",
]);

const VELVET_CANDLE_TEMPLATE_IDS = new Set([
  "velvet-candle",
  "velvet",
  "cake",
  "เค้ก",
  "10000000-0000-4000-8000-000000000013",
]);

const GRAND_NEW_YEAR_TEMPLATE_IDS = new Set([
  "new-year-grand-celebration",
  "grand-new-year",
  "new-year",
  "10000000-0000-4000-8000-000000000014",
]);

const SONGKRAN_SPLENDOR_TEMPLATE_IDS = new Set([
  "songkran-splendor",
  "songkran",
  "สงกรานต์",
  "10000000-0000-4000-8000-000000000015",
]);

const HALLOWEEN_HAUNTED_TEMPLATE_IDS = new Set([
  "halloween-haunted-scroll",
  "halloween-haunted",
  "halloween",
  "ฮาโลวีน",
  "10000000-0000-4000-8000-000000000016",
]);

const LOVE_OS_TEMPLATE_IDS = new Set([
  "love-os",
  "loveos",
  "desktop-confession",
  "10000000-0000-4000-8000-000000000017",
]);

const PIXEL_GACHA_TEMPLATE_IDS = new Set([
  "pixel-gacha",
  "gacha",
  "pixel",
  "กาชา",
  "10000000-0000-4000-8000-000000000018",
]);

const LUNAR_3D_TEMPLATE_IDS = new Set([
  "lunar-3d",
  "lunar",
  "moon",
  "moon-3d",
  "ดวงจันทร์",
  "10000000-0000-4000-8000-000000000019",
]);

const ORBIT_OF_US_TEMPLATE_IDS = new Set([
  "orbit-of-us",
  "orbit",
  "galaxy-3d",
  "orbit-3d",
  "กาแล็กซี",
  "10000000-0000-4000-8000-000000000020",
]);

export type TemplateRenderStrategy =
  | "anniversary-surprise"
  | "candles"
  | "storyline"
  | "retro-y2k"
  | "vintage-wax-seal"
  | "midnight-cinema"
  | "starlight-memories"
  | "velvet-candle"
  | "new-year-grand-celebration"
  | "songkran-splendor"
  | "halloween-haunted-scroll"
  | "love-os"
  | "pixel-gacha"
  | "lunar-3d"
  | "orbit-of-us"
  | "generic";

function hasAnyKey(value: unknown, keys: string[]): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return keys.some((key) => key in record);
}

/**
 * Detect Anniversary Surprise-shaped payloads (the spec schema: settings +
 * content with letter/memories/flowers/songMedia/finale).
 */
export function looksLikeSurpriseQRData(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const content = record.content;
  if (typeof content !== "object" || content === null) return false;
  const contentRecord = content as Record<string, unknown>;
  return (
    "settings" in record &&
    hasAnyKey(contentRecord, ["letter", "memories", "flowers", "songMedia", "finale"])
  );
}

/**
 * Decide which theme renders a stored card.
 *
 * Resolution order:
 * 1. Embedded payload id (content.templateId / content.template_id), else
 *    cards.template_id - explicit identity always wins.
 * 2. Known template id -> its dedicated rendering strategy.
 * 3. Anniversary-shaped payload -> the anniversary strategy.
 * 4. Everything else -> the generic viewer.
 */
export function resolveTemplateRenderStrategy(
  card: Pick<Card, "template_id">,
  embeddedContent: Record<string, unknown>,
): TemplateRenderStrategy {
  const embeddedTemplateId =
    typeof embeddedContent.templateId === "string"
      ? embeddedContent.templateId
      : typeof embeddedContent.template_id === "string"
        ? embeddedContent.template_id
        : "";
  const requestedTemplateId = embeddedTemplateId || card.template_id;
  if (ANNIVERSARY_SURPRISE_TEMPLATE_IDS.has(requestedTemplateId)) {
    return "anniversary-surprise";
  }
  if (CANDLES_TEMPLATE_IDS.has(requestedTemplateId)) {
    return "candles";
  }
  if (STORYLINE_TEMPLATE_IDS.has(requestedTemplateId)) return "storyline";
  if (RETRO_Y2K_TEMPLATE_IDS.has(requestedTemplateId)) return "retro-y2k";
  if (VINTAGE_WAX_SEAL_TEMPLATE_IDS.has(requestedTemplateId)) return "vintage-wax-seal";
  if (MIDNIGHT_CINEMA_TEMPLATE_IDS.has(requestedTemplateId)) return "midnight-cinema";
  if (STARLIGHT_MEMORIES_TEMPLATE_IDS.has(requestedTemplateId)) return "starlight-memories";
  if (VELVET_CANDLE_TEMPLATE_IDS.has(requestedTemplateId)) return "velvet-candle";
  if (GRAND_NEW_YEAR_TEMPLATE_IDS.has(requestedTemplateId)) return "new-year-grand-celebration";
  if (SONGKRAN_SPLENDOR_TEMPLATE_IDS.has(requestedTemplateId)) return "songkran-splendor";
  if (HALLOWEEN_HAUNTED_TEMPLATE_IDS.has(requestedTemplateId)) return "halloween-haunted-scroll";
  if (LOVE_OS_TEMPLATE_IDS.has(requestedTemplateId)) return "love-os";
  if (PIXEL_GACHA_TEMPLATE_IDS.has(requestedTemplateId)) return "pixel-gacha";
  if (LUNAR_3D_TEMPLATE_IDS.has(requestedTemplateId)) return "lunar-3d";
  if (ORBIT_OF_US_TEMPLATE_IDS.has(requestedTemplateId)) return "orbit-of-us";
  if (looksLikeSurpriseQRData(embeddedContent)) return "anniversary-surprise";
  return "generic";
}

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

export type TemplateRenderStrategy = "anniversary-surprise" | "candles" | "storyline" | "generic";

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
  if (looksLikeSurpriseQRData(embeddedContent)) return "anniversary-surprise";
  return "generic";
}

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Canonical Anniversary Surprise row UUID (seed migration 20260829000005).
 * The single replacement template every legacy card gets reassigned to.
 */
export const ANNIVERSARY_SURPRISE_TEMPLATE_UUID =
  "10000000-0000-4000-8000-000000000006";

/**
 * Reassign every card referencing `templateId` to the Anniversary Surprise
 * template, then permanently delete the template row.
 *
 * Prevents the `null value in column "template_id" of relation "cards" violates
 * not-null constraint` error: cards.template_id is NOT NULL and the FK is
 * enforced, so a template can only be deleted once no card points at it.
 *
 * The Anniversary Surprise template itself is protected from deletion.
 */
export async function reassignCardsAndDeleteTemplate(
  templateId: string,
): Promise<{ success: true; deletedTemplateId: string } | { success: false; error: string }> {
  const db = createAdminClient();

  if (templateId === ANNIVERSARY_SURPRISE_TEMPLATE_UUID) {
    return { success: false, error: "ไม่สามารถลบเทมเพลตหลัก Anniversary Surprise ได้" };
  }

  // Resolve the replacement template so we always reassign cards to a real,
  // existing row (never NULL). Match by slug, known UUID, or title.
  const { data: replacement, error: replacementError } = await db
    .from("templates")
    .select("id")
    .or(
      "slug.eq.anniversary-surprise," +
        `id.eq.${ANNIVERSARY_SURPRISE_TEMPLATE_UUID},` +
        "title.eq.Anniversary Surprise",
    )
    .maybeSingle();

  if (replacementError || !replacement) {
    return {
      success: false,
      error:
        replacementError?.message ??
        "ไม่พบเทมเพลต Anniversary Surprise สำหรับย้ายการ์ดเดิม กรุณาสร้างหรือเผยแพร่ก่อน",
    };
  }

  // 1) Reassign all cards that reference the template being deleted.
  const { error: reassignError } = await db
    .from("cards")
    .update({ template_id: replacement.id })
    .eq("template_id", templateId);

  if (reassignError) {
    return { success: false, error: `การย้ายการ์ดเดิมล้มเหลว: ${reassignError.message}` };
  }

  // 2) Delete the template row — safe now, no card references it anymore.
  const { error: deleteError } = await db.from("templates").delete().eq("id", templateId);
  if (deleteError) {
    return { success: false, error: `ไม่สามารถลบเทมเพลตได้: ${deleteError.message}` };
  }

  return { success: true, deletedTemplateId: templateId };
}
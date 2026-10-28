"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TemplateCategory, TemplateDemoLinks } from "@/types/database";
import { normalizeAdminCategory } from "@/constants/template-categories";
import { reassignCardsAndDeleteTemplate } from "@/lib/admin/template-delete";

/** Reads the four external demo-link inputs into the demo_video_links JSON shape. */
function parseTemplateDemoLinks(formData: FormData): TemplateDemoLinks {
  return {
    tiktok: String(formData.get("demo_tiktok") ?? "").trim(),
    youtube: String(formData.get("demo_youtube") ?? "").trim(),
    facebook: String(formData.get("demo_facebook") ?? "").trim(),
    instagram: String(formData.get("demo_instagram") ?? "").trim(),
  };
}

export async function approvePayment(paymentId: string) {
  const { user: adminUser } = await requireAdmin();

  // Delegates the ENTIRE approve flow to the single atomic DB transaction
  // (approve_payment_transaction, migration 20260827000004) executed with the
  // service-role client: status flip + wallet top-up OR package grant
  // (rank-safe tier, permanent/custom/premium template quotas + the 30-day
  // package duration via profiles.quota_expires_at) + add-on entitlements +
  // audit log. The previous bespoke logic here never granted package
  // entitlements - approving a Pro Pack slip silently skipped the template
  // credits and the package duration - and drifted from the
  // /api/admin/payments/approve route which already used the RPC.
  const adminDb = createAdminClient();
  const { data: result, error: rpcError } = await adminDb.rpc(
    "approve_payment_transaction",
    { p_payment_id: paymentId, p_admin_id: adminUser.id },
  );

  if (rpcError) {
    console.error("approve_payment_transaction failed:", rpcError);
    const msg = rpcError.message ?? "";
    if (msg.includes("does not exist or is not pending")) {
      return { error: "Payment is not pending." };
    }
    if (msg.includes("claimed_transfer_time") || msg.includes("claimed_bank_account_last4")) {
      return { error: "ต้องระบุเวลาและบัญชีที่ใช้โอนเงินก่อนอนุมัติ" };
    }
    return { error: msg || "ไม่สามารถอนุมัติรายการชำระเงินได้ กรุณาลองใหม่" };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  revalidatePath("/dashboard");
  revalidatePath("/topup");

  // The RPC returns the grantee's updated profile snapshot (credits/tier/
  // quotas/package duration) so the admin UI can display it immediately.
  const profile = (result ?? {}) as {
    amount?: number;
    credits?: number;
    tier?: string;
    quota_expires_at?: string | null;
  };
  return {
    success: true,
    amount: Number(profile.amount ?? 0),
    credits: profile.credits,
    tier: profile.tier,
    quotaExpiresAt: profile.quota_expires_at ?? null,
  };
}
export async function rejectPayment(paymentId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("payments")
    .update({ status: "rejected" })
    .eq("id", paymentId)
    .eq("status", "pending");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function createTemplate(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const title = String(formData.get("title") || "").trim();
  const category = normalizeAdminCategory(String(formData.get("category") ?? "")) as TemplateCategory;
  const previewUrl = String(formData.get("preview_url") ?? "").trim();
  const previewVideoUrl = String(formData.get("preview_video_url") ?? "").trim();
  const demoLinks = parseTemplateDemoLinks(formData);
  const price = Number(formData.get("price")) || 0;
  const isPremium = formData.get("is_premium") === "on";
  // explicit publish flag; default to true so newly-created templates appear
  // immediately in the gallery, dashboard, and create flow. Admins can
  // unpublish via the status toggle in /admin/templates.
  const rawPublished = formData.get("is_published");
  const isPublished = rawPublished === null
    ? true
    : rawPublished === "on" || rawPublished === "true" || rawPublished === "1";

  if (!title || !category || !previewUrl || !Number.isFinite(price) || price < 0) {
    return { error: "Title, category, preview URL, and valid price are required." };
  }

  const { error } = await supabase.from("templates").insert({
    title,
    category,
    preview_url: previewUrl,
    preview_video_url: previewVideoUrl || null,
    demo_video_links: demoLinks,
    price,
    is_premium: isPremium || price > 0,
    is_published: isPublished,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/templates");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/create");
  revalidatePath("/templates");
  revalidateTag("templates");
  return { success: true };
}

export async function updateTemplate(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const title = String(formData.get("title") || "").trim();
  const category = normalizeAdminCategory(String(formData.get("category") ?? "")) as TemplateCategory;
  const previewUrl = String(formData.get("preview_url") ?? "").trim();
  const previewVideoUrl = String(formData.get("preview_video_url") ?? "").trim();
  const demoLinks = parseTemplateDemoLinks(formData);
  const price = Number(formData.get("price")) || 0;
  const isPremium = formData.get("is_premium") === "on";

  if (!id || !title || !category || !previewUrl || !Number.isFinite(price) || price < 0) {
    return { error: "All template fields are required and valid." };
  }

  // Publish status is managed exclusively by the status toggle badge, so the
  // edit form no longer submits is_published. When it isn't provided, preserve the
  // template's existing value instead of overwriting it to false.
  const updates: Record<string, unknown> = {
    title,
    category,
    preview_url: previewUrl,
    preview_video_url: previewVideoUrl || null,
    demo_video_links: demoLinks,
    price,
    is_premium: isPremium || price > 0,
  };
  const activeRaw = formData.get("is_published");
  if (activeRaw !== null) {
    updates.is_published = activeRaw === "on" || activeRaw === "true" || activeRaw === "1";
  }

  const { error } = await supabase
    .from("templates")
    .update(updates)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/templates");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/create");
  revalidatePath("/templates");
  revalidateTag("templates");
  return { success: true };
}

export async function deleteTemplate(templateId: string) {
  await requireAdmin();

  const result = await reassignCardsAndDeleteTemplate(templateId);

  if (!result.success) {
    console.error("Failed to delete template:", result.error);
    return { success: false, error: result.error };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/templates");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/create");
  revalidatePath("/templates");
  revalidateTag("templates");
  return { success: true };
}

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reassignCardsAndDeleteTemplate } from "@/lib/admin/template-delete";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  let body: { is_published?: boolean; admin_preview_visible?: boolean } | null = null;
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as { is_published?: boolean; admin_preview_visible?: boolean };
    }
  } catch {
    body = null;
  }

  const updates: Record<string, boolean> = {};
  if (body && (typeof body.is_published === "boolean" || typeof body.admin_preview_visible === "boolean")) {
    if (typeof body.is_published === "boolean") {
      updates.is_published = body.is_published;
    }
    if (typeof body.admin_preview_visible === "boolean") {
      updates.admin_preview_visible = body.admin_preview_visible;
    }
  } else {
    const { data: template, error: fetchError } = await supabase
      .from("templates")
      .select("is_published")
      .eq("id", id)
      .single();

    if (fetchError || !template) {
      return NextResponse.json({ error: fetchError?.message ?? "Template not found" }, { status: 404 });
    }
    updates.is_published = !template.is_published;
  }

  let { data, error } = await supabase
    .from("templates")
    .update(updates)
    .eq("id", id)
    .select("id, is_published, admin_preview_visible")
    .single();

  // Graceful fallback if admin_preview_visible migration has not been applied yet.
  if (error && "admin_preview_visible" in updates && /admin_preview_visible/i.test(error.message)) {
    const fallbackUpdates: Record<string, boolean> = {};
    if (typeof updates.is_published === "boolean") {
      fallbackUpdates.is_published = updates.is_published;
    }
    if (Object.keys(fallbackUpdates).length === 0) {
      return NextResponse.json(
        { error: "กรุณารัน migration เพิ่มคอลัมน์ admin_preview_visible ก่อนใช้งานตัวเลือกนี้" },
        { status: 400 },
      );
    }
    const fallback = await supabase
      .from("templates")
      .update(fallbackUpdates)
      .eq("id", id)
      .select("id, is_published")
      .single();
    data = fallback.data
      ? { ...fallback.data, admin_preview_visible: true }
      : null;
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Purge the Dashboard / template gallery cache immediately so the status
  // toggle is reflected as soon as the admin flips a template's visibility flags.
  revalidatePath("/admin");
  revalidatePath("/admin/templates");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/create");
  revalidatePath("/templates");
  revalidateTag("templates");

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;

  // Reassign any cards referencing this template to Anniversary Surprise,
  // then delete the template — prevents FK / NOT-NULL constraint violations.
  const result = await reassignCardsAndDeleteTemplate(id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/templates");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/create");
  revalidatePath("/templates");
  revalidateTag("templates");

  return NextResponse.json({ success: true });
}

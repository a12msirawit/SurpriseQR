import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reassignCardsAndDeleteTemplate } from "@/lib/admin/template-delete";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const { data: template, error: fetchError } = await supabase
    .from("templates")
    .select("is_published")
    .eq("id", id)
    .single();

  if (fetchError || !template) {
    return NextResponse.json({ error: fetchError?.message ?? "Template not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("templates")
    .update({ is_published: !template.is_published })
    .eq("id", id)
    .select("id, is_published")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Purge the Dashboard / template gallery cache immediately so the status
  // toggle is reflected as soon as the admin flips a template's is_published flag.
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

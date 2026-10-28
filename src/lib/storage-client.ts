import { createClient } from "@/lib/supabase/client";

export async function uploadCardMedia(
  file: File,
  userId: string,
  cardId: string
): Promise<{ url: string; error?: string }> {
  const supabase = createClient();
  
  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `${userId}/${cardId}/${Date.now()}.${ext}`;
  
  const { error: uploadError } = await supabase.storage
    .from("card-media")
    .upload(fileName, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return { url: "", error: uploadError.message };
  }

  const { data: { publicUrl } } = supabase.storage
    .from("card-media")
    .getPublicUrl(fileName);

  return { url: publicUrl };
}

export async function uploadPaymentSlip(
  file: File,
  userId: string
): Promise<{ url: string; error?: string }> {
  const supabase = createClient();
  
  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `${userId}/${Date.now()}.${ext}`;
  
  const { error: uploadError } = await supabase.storage
    .from("slips")
    .upload(fileName, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return { url: "", error: uploadError.message };
  }

  const { data: { publicUrl } } = supabase.storage
    .from("slips")
    .getPublicUrl(fileName);

  return { url: publicUrl };
}

/** Bucket holding admin-uploaded template preview videos (migration 20260829000003). */
export const TEMPLATE_PREVIEW_BUCKET = "template-previews";

/**
 * Uploads a template preview video (MP4/WebM) to the `template-previews`
 * bucket and returns its public URL. Called from the admin template forms;
 * the RLS policy "Admins manage all template previews" gates the upload.
 */
export async function uploadTemplatePreviewVideo(
  file: File,
  templateId?: string
): Promise<{ url: string; error?: string }> {
  const supabase = createClient();

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const folder = templateId || "unassigned";
  const fileName = `templates/${folder}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(TEMPLATE_PREVIEW_BUCKET)
    .upload(fileName, file, {
      upsert: false,
      contentType: file.type || "video/mp4",
    });

  if (uploadError) {
    return { url: "", error: uploadError.message };
  }

  const { data: { publicUrl } } = supabase.storage
    .from(TEMPLATE_PREVIEW_BUCKET)
    .getPublicUrl(fileName);

  return { url: publicUrl };
}

import { createClient } from "@/lib/supabase/server";

export async function uploadCardMedia(
  file: File,
  userId: string,
  cardId: string
): Promise<{ url: string; error?: string }> {
  const supabase = await createClient();
  
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
  const supabase = await createClient();
  
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

export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    return { error: error.message };
  }

  return {};
}

import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getTemplateById as getStaticTemplateById, templateCatalog, type TemplateDefinition } from "@/data/templates";
import type { Template } from "@/types/database";

export interface UnifiedTemplate extends Template {
  systemDefinition?: TemplateDefinition;
}

function toUnifiedDatabaseTemplate(template: Template): UnifiedTemplate {
  // The live DB `price` column takes absolute priority. There is deliberately no
  // hardcoded fallback (e.g. 19) here — whatever the admin set in Supabase is
  // what gets surfaced to the Dashboard, gallery and listing.
  const price = Number(template.price ?? 0);
  const systemDefinition = getStaticTemplateById(template.id, template.title);
  return {
    ...template,
    title: template.title || "Template",
    is_premium: template.is_premium || price > 0,
    price,
    preview_url: template.preview_url || systemDefinition?.image || "/templates/surprise-qr.svg",
    systemDefinition,
  };
}

/**
 * Fetch all PUBLISHED templates directly from the Supabase `templates` table.
 *
 * Only rows where `is_published = true` are returned. There is deliberately NO
 * static/hardcoded catalog fallback: the Dashboard, template gallery, and
 * template listing API must reflect the exact set of DB-published templates.
 * Toggling a template's `is_published` flag in Admin is immediately reflected
 * here (hidden templates disappear, published templates appear).
 */
function createPublicTemplatesClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const getCachedPublishedTemplates = unstable_cache(
  async (): Promise<UnifiedTemplate[]> => {
    try {
      const supabase = createPublicTemplatesClient();
      if (!supabase) return [];

      const { data, error } = await supabase
        .from("templates")
        .select("id, title, category, is_premium, preview_url, preview_video_url, demo_video_links, is_published, price, created_at")
        .eq("is_published", true)
        .order("category", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load published templates from Supabase:", error);
        return [];
      }

      return ((data as Template[] | null) || [])
        .map(toUnifiedDatabaseTemplate)
        .filter((template) => template.is_published !== false);
    } catch (error) {
      console.error("Failed to load published templates from Supabase:", error);
      return [];
    }
  },
  ["published-templates"],
  { revalidate: 300, tags: ["templates"] },
);

export async function getAllTemplates(): Promise<UnifiedTemplate[]> {
  return getCachedPublishedTemplates();
}

export async function getTemplateById(id?: string): Promise<UnifiedTemplate | undefined> {
  const all = await getAllTemplates();
  const target = all.find((template) => template.id === id) ?? all[0];
  return target;
}

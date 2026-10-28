import { requireAuth, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CardBuilder from "@/components/cards/card-builder";
import type { Template } from "@/types/database";

export default async function CreateCardPage() {
  const user = await requireAuth();
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false });

  const tier = profile?.tier ?? "free";
  const isPremium = tier === "starter" || tier === "value" || tier === "pro" || tier === "vip";

  const filteredTemplates = (templates as Template[] ?? []).filter(
    (template) => !template.is_premium || isPremium
  );

  return (
    <main>
      <header>
        <h1>สร้างการ์ดใหม่</h1>
        <nav>
          <a href="/dashboard">กลับไปแดชบอร์ด</a>
        </nav>
      </header>
      <CardBuilder
        templates={filteredTemplates}
        isPremium={isPremium}
        userId={user.id}
        tier={tier}
      />
    </main>
  );
}

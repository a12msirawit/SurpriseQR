import { requireAuth, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCardForEdit } from "@/app/cards/actions";
import CardEditor from "@/components/cards/card-editor";
import { isPaidTier } from "@/lib/tierRules";
import type { Template } from "@/types/database";

export default async function EditCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const profile = await getProfile();
  const supabase = await createClient();

  const result = await getCardForEdit(id);

  if (result.error) {
    return (
      <main className="min-h-screen bg-neutral-950 px-4 py-10 text-slate-200">
        <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl">
          <h1 className="text-2xl font-black text-white">เกิดข้อผิดพลาด</h1>
          <p className="text-sm text-slate-400">{result.error}</p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition-all hover:bg-white/10"
          >
            กลับไปแดชบอร์ด
          </a>
        </div>
      </main>
    );
  }

  const card = result.card;

  const { data: templates } = await supabase
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false });

  const tier = profile?.tier ?? "free";
  const isPremium = isPaidTier(tier);

  const filteredTemplates = (templates as Template[] ?? []).filter(
    (template) => !template.is_premium || isPremium
  );

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 text-slate-200 lg:px-8">
      <CardEditor
        card={card}
        templates={filteredTemplates}
        isPremium={isPremium}
        userId={user.id}
        tier={tier}
      />
    </main>
  );
}

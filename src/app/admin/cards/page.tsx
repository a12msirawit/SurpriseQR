import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import CardModeration, { type AdminCardRow } from "@/components/admin/card-moderation";

export const dynamic = "force-dynamic";

export default async function AdminCardsPage() {
  const user = await requireAuth();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  const serviceClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [{ data: cards }, { data: authData }] = await Promise.all([
    supabase
      .from("cards")
      .select("id, hash_id, custom_slug, recipient_name, sender_name, status, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(500),
    serviceClient.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emails = new Map<string, string>();
  for (const authUser of authData?.users ?? []) {
    emails.set(authUser.id, authUser.email ?? "");
  }

  const rows: AdminCardRow[] = ((cards as Array<{
    id: string;
    hash_id: string;
    custom_slug: string | null;
    recipient_name: string;
    sender_name: string;
    status: string | null;
    created_at: string;
    user_id: string | null;
  }>) ?? []).map((card) => ({
    id: card.id,
    email: card.user_id ? emails.get(card.user_id) ?? "(ไม่ทราบอีเมล)" : "(ไม่มีเจ้าของ)",
    title: `ถึง ${card.recipient_name} • จาก ${card.sender_name}`,
    previewPath: `/c/${card.custom_slug || card.hash_id}`,
    status: (card.status ?? "published") as AdminCardRow["status"],
    created_at: card.created_at,
  }));

  return (
    <main className="min-h-screen bg-[#06030c] p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 -ml-4 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-fuchsia-300">
          ← กลับแดชบอร์ดผู้ดูแล
        </Link>
        <header className="mt-4 glass-panel rounded-2xl p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent md:text-3xl">
            ตรวจสอบและจัดการเนื้อหาการ์ด
          </h1>
          <p className="mt-1 text-sm text-slate-400">สลับสถานะ active / hidden / flagged เพื่อระงับการเข้าชมได้ทันที</p>
        </header>
        <section className="mt-6 glass-panel rounded-2xl p-6">
          <CardModeration cards={rows} />
        </section>
      </div>
    </main>
  );
}
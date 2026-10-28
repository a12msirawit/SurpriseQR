import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, FileClock } from "lucide-react";
import { requireAuth, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CardList from "@/components/dashboard/card-list";
import type { Card } from "@/types/database";

export default async function DraftsPage() {
  const user = await requireAuth();
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: drafts } = await supabase.from("cards").select("*").eq("user_id", user.id).eq("status", "draft").order("draft_expires_at", { ascending: true });

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;

  return (
    <main className="min-h-screen bg-[#06030c] text-slate-200">
      <div className="mx-auto w-full max-w-[1800px] px-4 lg:px-6 py-4">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-base font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" />กลับแดชบอร์ด</Link>
        <header className="mt-6 flex items-center gap-3"><FileClock className="h-8 w-8 text-space-accent" /><div><h1 className="text-3xl font-extrabold text-white">ร่างที่บันทึกไว้</h1><p className="mt-1 text-base font-medium text-slate-300">แก้ไขเนื้อหาและการตั้งค่าก่อนเผยแพร่การ์ดจริง</p></div></header>
        <div className="mt-6 rounded-2xl border border-space-accent/30 bg-space-accent/10 text-space-accent text-base font-semibold">ℹ️ บันทึกร่างไว้ได้สูงสุด 7 วัน หากไม่มีการกดสร้างการ์ดจริง ระบบจะลบฉบับร่างโดยอัตโนมัติ</div>
        <section className="mt-8 rounded-2xl border border-white/10 bg-[#120a21]/80 p-5 md:p-6">
          {(drafts ?? []).length > 0 && <div className="mb-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{(drafts as Card[]).map((draft) => { const days = Math.max(0, Math.ceil((new Date(draft.draft_expires_at ?? Date.now()).getTime() - Date.now()) / 86400000)); return <div key={draft.id} className="rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-base font-bold">ฉบับร่าง: {draft.recipient_name}<span className="mt-1 block text-sm font-medium">จะถูกลบในอีก {days} วัน</span></div>; })}</div>}
          <CardList cards={(drafts as Card[]) ?? []} tier={profile?.tier ?? "free"} baseUrl={baseUrl} isDraft />
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AdminTemplateTable from "@/components/admin/admin-template-table";
import type { Template } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminTemplatesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("templates")
    .select("id, title, category, price, is_premium, is_active, is_published, preview_url, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#06030c] p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="glass-panel rounded-2xl p-6">
          <Link href="/admin" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-purple-400"><ArrowLeft className="h-4 w-4" />กลับหน้าแอดมิน</Link>
          <div className="flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-purple-400" /><div><h1 className="text-3xl font-bold text-white">จัดการเทมเพลต</h1><p className="mt-1 text-sm text-slate-400">ค้นหา แก้ไข และจัดการการเผยแพร่เทมเพลต</p></div></div>
        </header>
        <section className="glass-panel rounded-2xl p-6"><AdminTemplateTable templates={(data as Template[]) ?? []} /></section>
      </div>
    </main>
  );
}

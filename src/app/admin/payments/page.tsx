import Link from "next/link";
import { redirect } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PaymentBackoffice from "@/components/admin/payment-backoffice";
import type { Payment } from "@/types/database";

export default async function AdminPaymentsPage() {
  const user = await requireAuth();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const { data } = await supabase.from("payments").select("*").eq("status", "pending").order("created_at", { ascending: false });
  return (
    <main className="min-h-screen bg-[#06030c] p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 -ml-4 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-fuchsia-300">
          ← กลับแดชบอร์ดผู้ดูแล
        </Link>
        <header className="mt-4 glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <ReceiptText className="h-7 w-7 shrink-0 text-fuchsia-400" />
            <div>
              <h1 className="bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent text-2xl font-bold md:text-3xl">
                ตรวจสอบสลิปชำระเงิน
              </h1>
              <p className="mt-1 text-sm text-slate-400">ตรวจสอบเวลาโอนและเลขท้ายบัญชีเทียบกับสลิปก่อนอนุมัติ</p>
            </div>
          </div>
        </header>
        <section className="mt-6 glass-panel rounded-2xl p-6">
          <PaymentBackoffice payments={(data as Payment[]) ?? []} />
        </section>
      </div>
    </main>
  );
}

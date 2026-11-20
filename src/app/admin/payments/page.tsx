import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import PaymentBackoffice from "@/components/admin/payment-backoffice";
import type { Payment } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const adminSupabase = createAdminClient();

  const [{ data }, { data: authData }] = await Promise.all([
    adminSupabase.from("payments").select("*").order("created_at", { ascending: false }),
    adminSupabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const userEmails = Object.fromEntries(
    (authData?.users ?? [])
      .filter((u) => Boolean(u.email))
      .map((u) => [u.id, u.email as string]),
  );

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
                ตรวจสอบและจัดการประวัติการเติมเงิน
              </h1>
              <p className="mt-1 text-sm text-slate-400">ดูประวัติแยกตามผู้ใช้ อนุมัติ/ปฏิเสธ ดูสลิป และลบรูปสลิปหรือรายการเพื่อประหยัดพื้นที่ Storage</p>
            </div>
          </div>
        </header>
        <section className="mt-6 glass-panel rounded-2xl p-6">
          <PaymentBackoffice payments={(data as Payment[]) ?? []} userEmails={userEmails} />
        </section>
      </div>
    </main>
  );
}

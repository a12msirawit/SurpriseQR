import { requireAuth, getAuthUser, getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PaymentModal from "@/components/payment/PaymentModal";
import type { Payment } from "@/types/database";

interface TopupHistoryItem {
  id: string;
  date: string;
  channel: string;
  amount: string;
  status: Payment["status"];
}

function formatThaiDate(isoString: string): string {
  const date = new Date(isoString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function getChannelLabel(payment: Payment): string {
  if (payment.payment_type === "topup") {
    return "เติมเงิน (PromptPay QR)";
  }
  if (payment.payment_type === "add_on_custom_url") {
    return "Add-on Custom URL";
  }
  if (payment.payment_type === "add_on_permanent") {
    return "Add-on จัดเก็บถาวร";
  }
  return "อื่นๆ";
}

function StatusBadge({ status }: { status: Payment["status"] }) {
  const successStatuses = ["approved", "completed", "success"];
  const failureStatuses = ["rejected", "failed"];

  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 px-3 py-1 text-xs font-semibold text-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        รอตรวจสอบ
      </span>
    );
  }

  if (successStatuses.includes(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        สำเร็จ
      </span>
    );
  }

  if (failureStatuses.includes(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-400/10 border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-300">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        ไม่สำเร็จ
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-400/10 border border-purple-400/30 px-3 py-1 text-xs font-semibold text-purple-300">
      {status}
    </span>
  );
}

function TopupHistoryTable({ items }: { items: TopupHistoryItem[] }) {
  return (
    <section className="w-full mt-8 bg-[#120a21]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-md shadow-xl">
      <h2 className="text-base lg:text-lg font-bold text-white flex items-center gap-2 mb-4">
        📜 ประวัติการทำรายการเติมเงิน
      </h2>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="min-w-full table-fixed">
          <thead className="bg-purple-950/40 text-purple-200 text-xs font-semibold">
            <tr>
              <th className="border-b border-white/10 px-4 py-3 text-left font-semibold">
                วันที่เติม
              </th>
              <th className="border-b border-white/10 px-4 py-3 text-left font-semibold">
                ช่องทาง
              </th>
              <th className="border-b border-white/10 px-4 py-3 text-right font-semibold">
                จำนวนเงิน
              </th>
              <th className="border-b border-white/10 px-4 py-3 text-left font-semibold">
                สถานะ
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-slate-500 text-center py-6">
                  ยังไม่มีประวัติการทำรายการ
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                  <td className="px-4 py-3 text-slate-400 text-xs lg:text-sm font-mono">
                    {item.date}
                  </td>
                  <td className="px-4 py-3 text-slate-200 text-xs lg:text-sm">
                    {item.channel}
                  </td>
                  <td className="px-4 py-3 text-emerald-400 font-bold text-xs lg:text-sm text-right font-mono">
                    {item.amount}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function TopupPage() {
  const user = await requireAuth();
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const topupHistory: TopupHistoryItem[] = (payments ?? []).map((payment) => ({
    id: payment.id,
    date: formatThaiDate(payment.created_at),
    channel: getChannelLabel(payment),
    amount: `฿${Number(payment.amount).toFixed(2)}`,
    status: payment.status,
  }));

  return (
    <main className="min-h-screen bg-[#06030c] p-4 md:p-8">
      <div className="w-full max-w-5xl mx-auto px-4 lg:px-8 py-6 space-y-8">
        <header className="mb-8">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปแดชบอร์ด
          </Link>
          <div className="flex items-center gap-3">
            <Coins className="h-8 w-8 text-space-accent" />
            <div>
              <h1 className="text-3xl font-bold text-white">
                เติมเงิน
              </h1>
              <p className="text-slate-400 mt-1">เลือกแพ็กเกจและอัปโหลดสลิปชำระเงิน</p>
            </div>
          </div>
        </header>

        {/* Current Balance Card */}
        <div className="mb-8 rounded-2xl border border-pink-400/30 glass-panel bg-white/5 p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-500">ยอดเงินคงเหลือ</p>
              <p className="text-4xl font-bold text-white">฿{Number(profile.credits).toFixed(2)}</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
              <Coins className="h-8 w-8 text-space-accent" />
            </div>
          </div>
        </div>

        <PaymentModal open embedded currentTier={profile.tier} />
        <TopupHistoryTable items={topupHistory} />
      </div>
    </main>
  );
}

import { requireAuth, getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import TopupClientView from "@/components/topup/TopupClientView";
import type { TopupHistoryItem } from "@/components/topup/TopupHistoryTable";
import type { Payment } from "@/types/database";

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
  const pendingPackagePurchase = (payments ?? []).find(
    (payment) => payment.status === "pending" && Boolean(payment.package_type),
  );
  const pendingPackageCreditApplied = Number(pendingPackagePurchase?.package_credit_applied ?? 0);

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

        <TopupClientView
          currentTier={profile.tier}
          currentPackageTier={profile.package_tier ?? null}
          packageExpiresAt={profile.package_expires_at ?? null}
          scheduledPackageTier={profile.scheduled_package_tier ?? null}
          scheduledPackageEffectiveAt={profile.scheduled_package_effective_at ?? null}
          scheduledPackagePaidAmount={Number(profile.scheduled_package_paid_amount ?? 0)}
          pendingPackageType={pendingPackagePurchase?.package_type ?? null}
          pendingPackageCreditApplied={pendingPackageCreditApplied}
          initialHistory={topupHistory}
        />
      </div>
    </main>
  );
}

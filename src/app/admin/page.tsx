import Link from "next/link";
import { ShieldCheck, Home, Sparkles, Users, Wallet, CreditCard, Globe } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/logout-button";
import PendingPayments from "@/components/admin/pending-payments";
import TemplateManager from "@/components/admin/template-manager";
import type { Payment, Template } from "@/types/database";

export default async function AdminPage() {
  await requireAdmin();
  const supabase = await createClient();

  // READ-ONLY METRICS computed from real tables (profiles, payments, cards,
  // site_visits). Global website traffic comes from site_visits (logged by
  // <SiteTracker /> in the root layout); per-card view counting is untouched.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const [totalUsersRes, newUsersRes, totalCardsRes, siteVisitsTotalRes, siteVisitsTodayRes, siteSessionsRes, approvedPaymentsRes, templateUsageRes, templatesRes, paymentsRes] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
      supabase.from("cards").select("id", { count: "exact", head: true }),
      supabase.from("site_visits").select("id", { count: "exact", head: true }),
      supabase.from("site_visits").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
      supabase.from("site_visits").select("session_id"),
      supabase.from("payments").select("amount, approved_at").eq("status", "approved"),
      supabase.from("cards").select("template_id"),
      supabase.from("templates").select("*").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    ]);

  const approvedPayments = approvedPaymentsRes.data ?? [];
  const totalRevenue = approvedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const monthlyRevenue = approvedPayments
    .filter((p) => p.approved_at && new Date(p.approved_at) >= monthStart)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const usageCounts = new Map<string, number>();
  for (const row of templateUsageRes.data ?? []) {
    if (row.template_id) usageCounts.set(row.template_id, (usageCounts.get(row.template_id) ?? 0) + 1);
  }
  const allTemplates = (templatesRes.data as Template[]) ?? [];
  const topTemplates = [...usageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([templateId, count]) => ({
      title: allTemplates.find((t) => t.id === templateId)?.title ?? "ไม่ทราบชื่อเทมเพลต",
      count,
    }));

  const payments = paymentsRes.data;

  // Global site traffic analytics
  const totalSiteVisits = siteVisitsTotalRes.count ?? 0;
  const todaySiteVisits = siteVisitsTodayRes.count ?? 0;
  const uniqueVisitors = new Set((siteSessionsRes.data ?? []).map((row) => row.session_id)).size;

  const stats = [
    { icon: Users, label: "ผู้ใช้ทั้งหมด", value: (totalUsersRes.count ?? 0).toLocaleString(), sub: `+${newUsersRes.count ?? 0} วันนี้` },
    { icon: Wallet, label: "รายได้รวม", value: `฿${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, sub: `เดือนนี้ ฿${monthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
    { icon: CreditCard, label: "การ์ดที่สร้างทั้งหมด", value: (totalCardsRes.count ?? 0).toLocaleString(), sub: null as string | null },
    { icon: Globe, label: "ยอดเข้าชมเว็บรวม", value: totalSiteVisits.toLocaleString(), sub: `+${todaySiteVisits} วันนี้ · ${uniqueVisitors.toLocaleString()} ผู้เข้าชมไม่ซ้ำ` },
  ];

  return (
    <main className="min-h-screen bg-[#06030c] p-4 md:p-8">
      <header className="max-w-7xl mx-auto mb-8">
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-fuchsia-400" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                  แดชบอร์ดผู้ดูแล
                </h1>
                <p className="text-slate-400 text-sm mt-1">สถิติ การชำระเงิน เทมเพลต และการจัดการเนื้อหา</p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl text-slate-300 hover:text-fuchsia-300 hover:bg-white/10 transition-all duration-200 flex items-center gap-2 text-sm font-medium"
              >
                แดชบอร์ด
              </Link>
              <Link
                href="/"
                className="px-4 py-2 rounded-xl text-slate-300 hover:text-fuchsia-300 hover:bg-white/10 transition-all duration-200 flex items-center gap-2 text-sm font-medium"
              >
                <Home className="w-4 h-4" />
                หน้าแรก
              </Link>
              <Link href="/admin/payments" className="px-4 py-2 rounded-xl text-slate-300 hover:text-fuchsia-300 hover:bg-white/10 transition-all duration-200 text-sm font-medium">
                ตรวจสอบสลิป
              </Link>
              <Link href="/admin/users" className="px-4 py-2 rounded-xl text-slate-300 hover:text-fuchsia-300 hover:bg-white/10 transition-all duration-200 text-sm font-medium">
                จัดการผู้ใช้
              </Link>
              <Link href="/admin/cards" className="px-4 py-2 rounded-xl text-slate-300 hover:text-fuchsia-300 hover:bg-white/10 transition-all duration-200 text-sm font-medium">
                จัดการการ์ด
              </Link>
              <LogoutButton />
            </nav>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-panel rounded-2xl p-5">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide">
                <stat.icon className="w-4 h-4 text-fuchsia-400" />
                {stat.label}
              </div>
              <p className="mt-2 text-2xl font-black text-white">{stat.value}</p>
              {stat.sub && <p className="mt-1 text-xs text-emerald-400 font-semibold">{stat.sub}</p>}
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-pink-400" />
            <h2 className="text-xl font-bold text-white">Top 5 เทมเพลตยอดนิยม</h2>
          </div>
          {topTemplates.length === 0 ? (
            <p className="py-6 text-center text-slate-400 text-sm">ยังไม่มีการนำเทมเพลตไปสร้างการ์ด</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-space-border">
                  <th className="p-3 text-slate-300">#</th>
                  <th className="p-3 text-slate-300">เทมเพลต</th>
                  <th className="p-3 text-slate-300">จำนวนการ์ดที่สร้าง</th>
                </tr>
              </thead>
              <tbody>
                {topTemplates.map((entry, index) => (
                  <tr key={`${entry.title}-${index}`} className="border-b border-space-border">
                    <td className="p-3 font-bold text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-slate-200">{entry.title}</td>
                    <td className="p-3 font-mono text-slate-300">{entry.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-2xl font-bold text-white">คำขอชำระเงินที่รอดำเนินการ</h2>
          </div>
          <PendingPayments payments={(payments as Payment[]) ?? []} />
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">จัดการเทมเพลต</h2>
          </div>
          <TemplateManager templates={allTemplates} />
        </div>
      </section>
    </main>
  );
}

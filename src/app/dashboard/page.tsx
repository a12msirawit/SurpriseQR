import { headers } from "next/headers";
import Link from "next/link";
import { ArrowRight, CreditCard, Layers, Plus, Sparkles } from "lucide-react";
import { getAuthUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CardList from "@/components/dashboard/card-list";
import TemplateShowcase from "@/components/dashboard/template-showcase";
import TierStatusCard from "@/components/dashboard/tier-status-card";
import Navbar from "@/components/dashboard/navbar";
import { MotionDiv, MotionSection } from "@/components/dashboard/motion-wrapper";
import { getAllTemplates, type UnifiedTemplate } from "@/lib/templates";
import type { Card, Template } from "@/types/database";

export default async function DashboardPage() {
  const user = await getAuthUser();
  const profile = await getProfile();
  const supabase = await createClient();

  const [{ data: cards }, allTemplates] = await Promise.all([
    user
      ? supabase.from("cards").select("*").eq("user_id", user.id).neq("status", "draft").order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Card[] }),
    getAllTemplates(),
  ]);

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;

  const tier = profile?.tier ?? "free";
  const isAdmin = profile?.role === "admin";
  const displayName = user?.email?.split("@")[0] ?? "ผู้เยี่ยมชม";

  const showcaseTemplates: Template[] = allTemplates.slice(0, 6).map((t: UnifiedTemplate) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    is_premium: t.is_premium,
    price: t.price,
    preview_url: t.preview_url,
    preview_video_url: t.preview_video_url ?? null,
    demo_video_links: t.demo_video_links ?? null,
    created_at: t.created_at,
  }));

  return (
    <div className="min-h-screen w-full bg-transparent font-['Prompt'] text-slate-100">
      <Navbar user={user ? { id: user.id } : null} isAdmin={isAdmin} displayName={displayName} />

      <main className="w-full max-w-[1800px] mx-auto px-4 lg:px-6 py-4 space-y-6">
        {!user && <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="glass-panel rounded-2xl px-5 py-4 text-base font-medium text-slate-200 shadow-sm">โหมดผู้เยี่ยมชม: การ์ดจะถูกบันทึกในเครื่องนี้เท่านั้น สมัครสมาชิกเพื่อบันทึกข้อมูลถาวร</MotionDiv>}
        <MotionSection initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="flex w-full flex-col gap-6 rounded-3xl border border-purple-900/30 bg-[#0d071b]/80 p-4 backdrop-blur-md overflow-hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-base font-semibold text-slate-200"><Sparkles className="h-4 w-4 text-space-accent" />{user ? `สวัสดี, ${displayName}` : "โหมดผู้เยี่ยมชม"}</p>
              <h1 className="mt-2 text-2xl font-extrabold text-white md:text-3xl">จัดการการ์ดเซอร์ไพรส์ของคุณ</h1>
            </div>

            <Link href="/topup" className="btn-gradient inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent sm:w-auto md:px-5 md:text-base"><CreditCard className="h-4 w-4" />+ เติมเงิน<ArrowRight className="h-4 w-4" /></Link>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} className="rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-space-accent"><TierStatusCard tier={tier} permanentQuota={profile?.permanent_quota ?? 0} premiumQuota={profile?.premium_quota ?? 0} usedPermanentQuota={(cards as Card[] | null)?.filter((card) => card.is_permanent).length ?? 0} quotaExpiresAt={profile?.quota_expires_at ?? null} /></MotionDiv>

            <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }} className="glass-panel w-full rounded-2xl border border-purple-900/40 bg-[#120a21]/90 p-5 shadow-xl backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
              <div className="flex w-full flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-300 sm:text-base"><CreditCard className="h-4 w-4 text-space-accent" />ยอดเงินคงเหลือ</span>
                  <p className="text-2xl font-extrabold tracking-tight text-emerald-400 font-mono sm:text-3xl">฿{Number(profile?.credits ?? 0).toFixed(2)}</p>
                </div>

              </div>
            </MotionDiv>

            <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }} className="glass-panel flex flex-col gap-2 rounded-2xl border-space-border p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md md:gap-3 md:p-4">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-200"><Layers className="h-4 w-4 text-space-accent" />สถานะการใช้งาน</span>
              <p className="text-xl font-bold text-space-accent md:text-3xl md:font-black">{cards?.length ?? 0} การ์ด</p>
            </MotionDiv>
          </div>
        </MotionSection>

        <TemplateShowcase templates={showcaseTemplates} />

        <MotionSection initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }} className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-[#120a21]/80 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-base font-bold text-slate-200"><Layers className="h-4 w-4 text-slate-200" />คลังของคุณ</p>
              <h2 className="text-xl font-bold text-white">การ์ดของคุณ</h2>
            </div>

            <Link href="/templates" className="btn-gradient inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-bold text-white transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent"><Plus className="h-4 w-4" />สร้างการ์ดใหม่<ArrowRight className="h-4 w-4" /></Link>
          </div>

        <CardList cards={(cards as Card[]) ?? []} templates={allTemplates} tier={tier} baseUrl={baseUrl} isGuest={!user} />
        </MotionSection>

      </main>
    </div>
  );
}

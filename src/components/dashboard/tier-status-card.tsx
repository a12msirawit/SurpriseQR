"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Crown, X, Zap } from "lucide-react";
import type { UserTier } from "@/types/database";

interface TierStatusCardProps {
  tier: UserTier;
  permanentQuota: number;
  premiumQuota: number;
  usedPermanentQuota: number;
  quotaExpiresAt: string | null;
}

const TIER_LABELS: Record<UserTier, string> = {
  guest: "ผู้เยี่ยมชม",
  free: "ฟรี",
  starter: "Starter Pack",
  value: "Value Pack",
  pro: "Pro Pack",
  god: "God Pack",
  vip: "VIP",
};

const TIER_STYLES: Record<UserTier, { border: string; glow: string; badge: string; title: string; icon: string }> = {
  guest: {
    border: "border border-slate-500/35 hover:border-slate-400/55",
    glow: "shadow-[0_0_20px_-8px_rgba(148,163,184,0.2)]",
    badge: "border border-slate-400/30 bg-slate-500/15 text-slate-300",
    title: "text-slate-200",
    icon: "text-slate-400",
  },
  free: {
    border: "border border-slate-400/40 hover:border-slate-300/65",
    glow: "shadow-[0_0_22px_-8px_rgba(203,213,225,0.22)]",
    badge: "border border-slate-300/30 bg-slate-400/15 text-slate-200",
    title: "text-white",
    icon: "text-slate-300",
  },
  starter: {
    border: "border border-emerald-400/50 hover:border-emerald-300/80",
    glow: "shadow-[0_0_26px_-6px_rgba(16,185,129,0.3)]",
    badge: "border border-emerald-400/40 bg-emerald-500/20 text-emerald-200",
    title: "bg-gradient-to-r from-emerald-200 to-teal-300 bg-clip-text text-transparent",
    icon: "text-emerald-400",
  },
  value: {
    border: "border border-sky-400/55 hover:border-sky-300/85",
    glow: "shadow-[0_0_28px_-6px_rgba(56,189,248,0.34)]",
    badge: "border border-sky-400/45 bg-sky-500/20 text-sky-200",
    title: "bg-gradient-to-r from-sky-200 via-cyan-200 to-blue-300 bg-clip-text text-transparent",
    icon: "text-sky-400",
  },
  pro: {
    border: "border border-violet-400/60 hover:border-fuchsia-300/85",
    glow: "shadow-[0_0_32px_-6px_rgba(168,85,247,0.4)]",
    badge: "border border-violet-400/50 bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 text-violet-100",
    title: "bg-gradient-to-r from-violet-200 via-fuchsia-200 to-pink-300 bg-clip-text text-transparent",
    icon: "text-fuchsia-400",
  },
  god: {
    border: "border border-rose-400/70 hover:border-rose-300/95",
    glow: "shadow-[0_0_38px_-6px_rgba(244,63,94,0.46)]",
    badge: "bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 text-white shadow-sm shadow-rose-500/30",
    title: "bg-gradient-to-r from-rose-200 via-pink-200 to-amber-200 bg-clip-text text-transparent",
    icon: "text-rose-400",
  },
  vip: {
    border: "border border-amber-400/70 hover:border-amber-300/95",
    glow: "shadow-[0_0_38px_-6px_rgba(251,191,36,0.46)]",
    badge: "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-extrabold shadow-sm shadow-amber-500/30",
    title: "bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-400 bg-clip-text text-transparent",
    icon: "text-amber-400",
  },
};

const PACKAGE_SPECS: Record<string, { media: string; priority: boolean }> = {
  guest: { media: "รวมสูงสุด 150 MB ต่อเทมเพลต", priority: false },
  free: { media: "รวมสูงสุด 150 MB (เทมเพลตพรีเมียม 300 MB)", priority: false },
  starter: { media: "รวมสูงสุด 200 MB ต่อเทมเพลต", priority: false },
  value: { media: "รวมสูงสุด 300 MB ต่อเทมเพลต", priority: false },
  pro: { media: "รวมสูงสุด 500 MB ต่อเทมเพลต", priority: true },
  god: { media: "รวมสูงสุด 1 GB ต่อเทมเพลต", priority: true },
  vip: { media: "รวมสูงสุด 1 GB ต่อเทมเพลต", priority: true },
};

const UNLIMITED_QUOTA = 2147483647;
const UNLIMITED_TIERS = new Set(["god", "vip"]);

export default function TierStatusCard({ tier, permanentQuota, premiumQuota, usedPermanentQuota, quotaExpiresAt }: TierStatusCardProps) {
  void usedPermanentQuota;
  const [open, setOpen] = useState(false);
  const effectiveTier = tier || "free";
  const hasQuota = permanentQuota > 0 || premiumQuota > 0;
  const expirationLabel = effectiveTier === "free" || effectiveTier === "guest"
    ? (hasQuota ? "สิทธิ์คงเหลือไม่มีวันหมดอายุ" : "ยังไม่มีแพ็กเกจใช้งาน")
    : "โควตาและสิทธิ์ไม่มีวันหมดอายุ (เก็บไว้ใช้ได้ตลอด)";
  const packageTier = effectiveTier === "guest" ? "free" : effectiveTier;
  const baseSpecs = PACKAGE_SPECS[packageTier] ?? PACKAGE_SPECS.free;
  const isUnlimited = UNLIMITED_TIERS.has(packageTier) || permanentQuota >= UNLIMITED_QUOTA;
  const packageSpecs = {
    storage: isUnlimited ? "ไม่จำกัด" : `${permanentQuota} ใบ`,
    templates: `${premiumQuota} เทมเพลต`,
    media: baseSpecs.media,
    priority: baseSpecs.priority,
  };
  const packageLabel = TIER_LABELS[effectiveTier] ?? TIER_LABELS.free;
  const tierStyle = TIER_STYLES[effectiveTier] ?? TIER_STYLES.free;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`glass-panel w-full rounded-2xl p-4 text-left transition-all duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent ${tierStyle.border} ${tierStyle.glow}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className={`flex items-center gap-2 ${tierStyle.icon}`}><Crown className="h-4 w-4" /><span className="text-sm font-bold text-slate-200">ระดับบัญชี</span></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold shadow-sm ${tierStyle.badge}`}>{TIER_LABELS[effectiveTier]}</span>
        </div>
        <p className={`text-3xl font-black ${tierStyle.title}`}>{TIER_LABELS[effectiveTier]}</p>
        <p className="mt-2 text-base font-medium text-slate-300">คลิกเพื่อดูสิทธิ์แพ็กเกจ</p>
      </button>
      {open && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center bg-black/60 p-4 backdrop-blur-md" role="dialog" aria-modal="true"><div className="glass-panel relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border-space-border bg-[#06030c]/95 p-8 text-slate-100 shadow-2xl"><div className="flex items-start justify-between gap-4"><h2 className="text-2xl font-black text-white">รายละเอียดสิทธิ์แพ็กเกจ {packageLabel}</h2><button type="button" onClick={() => setOpen(false)} aria-label="ปิด" className="inline-flex shrink-0 items-center gap-1 rounded-xl p-2 text-slate-300 hover:text-white"><X className="h-5 w-5" /><span>ปิด</span></button></div><div className="mt-6 grid gap-4 md:grid-cols-2"><p className="glass-panel flex flex-col gap-1 rounded-xl border-space-border p-4"><span className="text-base font-bold text-slate-300">สิทธิ์จัดเก็บถาวร</span><strong className="text-lg font-extrabold text-space-accent">{packageSpecs.storage}</strong></p><p className="glass-panel flex flex-col gap-1 rounded-xl border-space-border p-4"><span className="text-base font-bold text-slate-300">สิทธิ์เทมเพลตพรีเมียม</span><strong className="text-lg font-extrabold text-space-glow">{packageSpecs.templates}</strong></p><p className="glass-panel flex flex-col gap-1 rounded-xl border-space-border p-4"><span className="text-base font-bold text-slate-300">ขนาดไฟล์สื่อสูงสุด</span><strong className="text-lg font-extrabold text-space-glow">{packageSpecs.media}</strong></p>{packageSpecs.priority ? <p className="flex flex-col gap-1 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3"><span className="text-base font-bold text-slate-300"><Zap className="mr-1 inline h-4 w-4 text-amber-300" />สิทธิ์ประมวลผล Priority</span><strong className="text-lg font-semibold text-amber-200">มีสิทธิ์</strong></p> : null}<p className="flex flex-col gap-1 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3"><span className="text-base font-bold text-slate-300">วันหมดอายุแพ็กเกจ</span><strong className="text-lg font-semibold text-amber-200">{expirationLabel}</strong></p></div><Link href="/topup" className="btn-gradient mt-6 block w-full rounded-2xl px-6 py-3.5 text-center text-lg font-bold text-white shadow-md">เติมเงิน / อัปเกรดแพ็กเกจ</Link></div></div>, document.body) : null}
    </>
  );
}
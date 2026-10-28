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

const PACKAGE_SPECS: Record<string, { media: string; priority: boolean }> = {
  guest: { media: "ภาพ 5 MB | เสียง 5 MB | วิดีโอ 10 MB ต่อไฟล์", priority: false },
  free: { media: "ภาพ 5 MB | เสียง 5 MB | วิดีโอ 10 MB ต่อไฟล์", priority: false },
  starter: { media: "ภาพ 5 MB | เสียง 5 MB | วิดีโอ 10 MB ต่อไฟล์", priority: false },
  value: { media: "ภาพ 10 MB | เสียง 10 MB | วิดีโอ 35 MB ต่อไฟล์", priority: false },
  pro: { media: "ภาพ 10 MB | เสียง 20 MB | วิดีโอ 50 MB ต่อไฟล์", priority: true },
  god: { media: "ภาพ 15 MB | เสียง 25 MB | วิดีโอ 100 MB ต่อไฟล์", priority: true },
  vip: { media: "ภาพ 15 MB | เสียง 25 MB | วิดีโอ 100 MB ต่อไฟล์", priority: true },
};

const UNLIMITED_QUOTA = 2147483647;
const UNLIMITED_TIERS = new Set(["god", "vip"]);

export default function TierStatusCard({ tier, permanentQuota, premiumQuota, usedPermanentQuota, quotaExpiresAt }: TierStatusCardProps) {
  void usedPermanentQuota;
  const [open, setOpen] = useState(false);
  const effectiveTier = tier || "free";
  const expirationDate = quotaExpiresAt ? new Date(quotaExpiresAt) : null;
  const hasActivePackage = expirationDate !== null && !Number.isNaN(expirationDate.getTime()) && expirationDate > new Date();
  const expirationLabel = hasActivePackage
    ? `เหลือเวลา ${Math.max(0, Math.ceil((expirationDate.getTime() - Date.now()) / 86400000))} วัน (หมดอายุ ${expirationDate.toLocaleDateString("th-TH")})`
    : quotaExpiresAt ? "หมดอายุแล้ว" : "ยังไม่มีแพ็กเกจใช้งาน";
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

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="glass-panel w-full rounded-2xl border-space-border p-4 text-left text-space-accent transition-all duration-200 hover:bg-white/10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-space-accent"><Crown className="h-4 w-4" /><span className="text-sm font-bold text-slate-200">ระดับบัญชี</span></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm ${
            effectiveTier === "god"
              ? "bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 shadow-purple-500/30"
              : effectiveTier === "vip"
                ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900"
                : "bg-white/10 text-slate-300"
          }`}>{TIER_LABELS[effectiveTier]}</span>
        </div>
        <p className="text-3xl font-black text-white">{TIER_LABELS[effectiveTier]}</p>
        <p className="mt-2 text-base font-medium text-slate-300">คลิกเพื่อดูสิทธิ์แพ็กเกจ</p>
      </button>
      {open && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center bg-black/60 p-4 backdrop-blur-md" role="dialog" aria-modal="true"><div className="glass-panel relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border-space-border bg-[#06030c]/95 p-8 text-slate-100 shadow-2xl"><div className="flex items-start justify-between gap-4"><h2 className="text-2xl font-black text-white">รายละเอียดสิทธิ์แพ็กเกจ {packageLabel}</h2><button type="button" onClick={() => setOpen(false)} aria-label="ปิด" className="inline-flex shrink-0 items-center gap-1 rounded-xl p-2 text-slate-300 hover:text-white"><X className="h-5 w-5" /><span>ปิด</span></button></div><div className="mt-6 grid gap-4 md:grid-cols-2"><p className="glass-panel flex flex-col gap-1 rounded-xl border-space-border p-4"><span className="text-base font-bold text-slate-300">สิทธิ์จัดเก็บถาวร</span><strong className="text-lg font-extrabold text-space-accent">{packageSpecs.storage}</strong></p><p className="glass-panel flex flex-col gap-1 rounded-xl border-space-border p-4"><span className="text-base font-bold text-slate-300">สิทธิ์เทมเพลตพรีเมียม</span><strong className="text-lg font-extrabold text-space-glow">{packageSpecs.templates}</strong></p><p className="glass-panel flex flex-col gap-1 rounded-xl border-space-border p-4"><span className="text-base font-bold text-slate-300">ขนาดไฟล์สื่อสูงสุด</span><strong className="text-lg font-extrabold text-space-glow">{packageSpecs.media}</strong></p>{packageSpecs.priority ? <p className="flex flex-col gap-1 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3"><span className="text-base font-bold text-slate-300"><Zap className="mr-1 inline h-4 w-4 text-amber-300" />สิทธิ์ประมวลผล Priority</span><strong className="text-lg font-semibold text-amber-200">มีสิทธิ์</strong></p> : null}<p className="flex flex-col gap-1 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3"><span className="text-base font-bold text-slate-300">วันหมดอายุแพ็กเกจ</span><strong className="text-lg font-semibold text-amber-200">{expirationLabel}</strong></p></div><Link href="/topup" className="btn-gradient mt-6 block w-full rounded-2xl px-6 py-3.5 text-center text-lg font-bold text-white shadow-md">เติมเงิน / อัปเกรดแพ็กเกจ</Link></div></div>, document.body) : null}
    </>
  );
}
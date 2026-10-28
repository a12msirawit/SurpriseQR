"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Coins, X } from "lucide-react";

type AddOnType = "add_on_permanent";

interface AddOnPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  cardId?: string;
  onSubmitted?: (type: AddOnType) => void;
}

const ADD_ON = { type: "add_on_permanent" as const, title: "เก็บข้อมูลถาวร + Custom URL", detail: "การ์ดไม่มีวันหมดอายุ พร้อมปลดล็อกสิทธิ์ตั้งชื่อลิงก์ Custom URL ทันที" };

export default function AddOnPurchaseModal({ open, onClose, cardId, onSubmitted }: AddOnPurchaseModalProps) {
  const type: AddOnType = "add_on_permanent";
  const [credits, setCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [purchased, setPurchased] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const hasTriggeredSuccessRef = useRef(false);

  useEffect(() => {
    if (!open) {
      hasTriggeredSuccessRef.current = false;
      return;
    }
    if (hasTriggeredSuccessRef.current) return;
    let cancelled = false;
    setError(null);
    setPurchased(false);
    setBalanceLoading(true);
    fetch("/api/user/credits")
      .then((response) => response.json())
      .then((data) => { if (!cancelled) setCredits(Number(data.credits ?? 0)); })
      .catch(() => { if (!cancelled) setError("ไม่สามารถโหลดยอดเงินได้"); })
      .finally(() => { if (!cancelled) setBalanceLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  async function purchase() {
    if ((credits ?? 0) < 25) {
      setError("ยอดเงินไม่เพียงพอ (ต้องการ 25 บาท)");
      return;
    }
    if (type === "add_on_permanent" && !cardId) {
      setError("กรุณาเปิดรายการนี้จากการ์ดที่ต้องการเก็บถาวร");
      return;
    }
    if (!window.confirm("ต้องการใช้ 25 บาท เพื่อเปิดใช้งานสิทธิ์นี้หรือไม่?")) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/addons/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, cardId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        return;
      }
      if (hasTriggeredSuccessRef.current) return;
      hasTriggeredSuccessRef.current = true;
      setCredits(Number(data.remainingCredits));
      setPurchased(true);
      onSubmitted?.(type);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;
  const insufficient = credits !== null && credits < 25;
  const purchaseDisabled = balanceLoading || loading || credits === null || insufficient;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="relative max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-[#06030c]/95 backdrop-blur-xl border border-space-border p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-space-accent">สิทธิ์เสริม SurpriseQR</p><h2 className="mt-1 text-2xl font-black text-white">ซื้อสิทธิ์เพิ่ม</h2></div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-full p-2 text-slate-400 hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>
          {purchased ? (
            <div className="py-10 text-center"><Check className="mx-auto h-14 w-14 text-emerald-500" /><h3 className="mt-4 text-xl font-bold text-white">เปิดใช้งานสิทธิ์เก็บถาวรและ Custom URL เรียบร้อยแล้ว</h3><p className="mt-2 text-sm text-slate-400">สิทธิ์ถูกเพิ่มให้คุณทันที</p></div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-white/10 p-4"><span className="flex items-center gap-2 font-semibold text-slate-200"><Coins className="h-5 w-5 text-amber-500" />ยอดเงินคงเหลือ: {credits === null ? "กำลังโหลด..." : `฿${credits.toFixed(2)}`}</span></div>
            <div className="rounded-xl border-2 border-space-accent bg-white/5 p-4 text-left"><span className="flex items-center justify-between gap-3 font-bold text-white"><span>{ADD_ON.title}</span><span className="shrink-0">25 บาท</span></span><span className="mt-1 block text-sm text-slate-400">{ADD_ON.detail}</span></div>
            {insufficient && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">ยอดเงินไม่เพียงพอ (ต้องการ 25 บาท)</div>}
            {error && <p className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">{error}</p>}
            {insufficient ? <Link href="/topup" onClick={onClose} className="block w-full rounded-xl btn-gradient px-4 py-3 text-center font-bold text-white">ไปที่หน้าเติมเงิน</Link> : <button type="button" disabled={purchaseDisabled} onClick={() => void purchase()} className="w-full rounded-xl btn-gradient px-4 py-3 font-bold text-white disabled:opacity-50">{loading ? "กำลังดำเนินการ..." : "ยืนยันการใช้ 25 บาท"}</button>}
          </div>
        )}
      </div>
    </div>
  );
}

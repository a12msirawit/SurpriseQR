"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, CheckCircle2, Clock3, Download, QrCode, UploadCloud, Wallet, X } from "lucide-react";
import generatePayload from "promptpay-qr";
import { QRCodeSVG } from "qrcode.react";
import type { UserTier } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { PRICING_PACKAGES, getPackageFeatures, STACKING_FOOTNOTE, type PricingPackage } from "@/lib/packages";

interface PaymentModalProps {
  open: boolean;
  onClose?: () => void;
  onSubmitted?: () => void;
  embedded?: boolean;
  currentTier?: UserTier;
}

export default function PaymentModal({ open, onClose, onSubmitted, embedded = false, currentTier = "free" }: PaymentModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"amount" | "method" | "confirm" | "qr" | "submitted">("amount");
  const [selectedPackage, setSelectedPackage] = useState<PricingPackage | null>(null);
  const [amount, setAmount] = useState(119);
  const [customAmount, setCustomAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const [transferTime, setTransferTime] = useState("");
  const [last4, setLast4] = useState("");
  const qrRef = useRef<SVGSVGElement>(null);
  const selectedAmount = customAmount ? Number(customAmount) : amount;
  const promptPayId = process.env.NEXT_PUBLIC_PROMPTPAY_ID || "0000000000";
  const payload = generatePayload(promptPayId, { amount: selectedAmount });
  const expired = secondsLeft === 0;
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  // All packages are ALWAYS visible for every tier (free/guest → vip): users
  // may freely browse and purchase any package. `currentTier` is used only to
  // badge and disable the card matching the user's currently active tier.
  const visiblePackages = PRICING_PACKAGES;

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      // Fetch the latest wallet balance directly from profiles so the modal
      // always reflects updated credits — including top-ups/package grants
      // just approved by an admin.
      void supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (!data) return;
          if (typeof data.credits === "number") setWalletBalance(Number(data.credits));
        });
    });
  }, [open]);

  useEffect(() => {
    if (!open || step !== "qr" || expired) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [expired, open, step]);

  function resetModal() {
    setStep("amount");
    setSelectedPackage(null);
    setSecondsLeft(600);
    setFile(null);
    setCustomAmount("");
    setError(null);
    setMessage(null);
    setTransferTime("");
    setLast4("");
    setSubmittedAt(null);
    setWalletBalance(null);
  }

  function choosePackage(pkg: PricingPackage) {
    setSelectedPackage(pkg);
    setAmount(pkg.price);
    setCustomAmount("");
    setError(null);
    setStep("method");
    void fetch("/api/user/credits")
      .then((response) => response.json())
      .then((data: { credits?: number }) => setWalletBalance(Number(data.credits ?? 0)))
      .catch(() => setWalletBalance(0));
  }

  function requestWalletConfirmation() {
    setError(null);
    setStep("confirm");
  }

  async function payWithWallet() {
    if (!selectedPackage) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/package", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageType: selectedPackage.id }) });
      const data = await response.json() as { error?: string; profile?: { credits?: number } };
      if (!response.ok) {
        setError(data.error ?? "ไม่สามารถซื้อแพ็กเกจได้");
        return;
      }
      if (data.profile) {
        setWalletBalance(Number(data.profile.credits ?? 0));
      }
      router.refresh();
      setMessage("ซื้อแพ็กเกจสำเร็จแล้ว");
      setStep("submitted");
      onSubmitted?.();
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  function createQr() {
    if (!Number.isFinite(selectedAmount) || selectedAmount < 1) {
      setError("กรุณาระบุจำนวนเงินอย่างน้อย 1 บาท");
      return;
    }
    setError(null);
    setMessage(null);
    setFile(null);
    setSecondsLeft(600);
    setStep("qr");
  }

  function downloadQr() {
    const svg = qrRef.current;
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `promptpay-${selectedAmount}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || expired) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("slip", file);
    formData.append("amount", String(selectedAmount));
    formData.append("credits_granted", selectedPackage ? "0" : String(selectedAmount));
    if (selectedPackage) formData.append("package_type", selectedPackage.id);
    formData.append("claimed_transfer_time", transferTime);
    formData.append("claimed_bank_account_last4", last4.trim());
    if (!transferTime) {
      setError("กรุณาระบุเวลาที่โอนเงิน");
      setLoading(false);
      return;
    }
    if (!/^[0-9]{4}$/.test(last4.trim())) {
      setError("กรุณาระบุเลขท้ายบัญชี 4 หลัก");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/payments/submit", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "ไม่สามารถส่งสลิปได้");
        return;
      }
      setSubmittedAt(new Date());
      setMessage(null);
      setStep("submitted");
      onSubmitted?.();
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className={embedded ? "w-full" : "fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"} role="dialog" aria-modal="true">
      <div className={embedded ? "glass-panel w-[92vw] max-w-5xl sm:max-w-5xl mx-auto rounded-2xl border-purple-400/30 bg-[#06030c]/95 p-6 sm:p-10 shadow-sm backdrop-blur-xl" : "glass-panel relative max-h-[90vh] w-[92vw] max-w-5xl sm:max-w-5xl mx-auto overflow-y-auto rounded-3xl border-space-border bg-[#06030c]/95 p-6 sm:p-10 text-slate-100 shadow-sm backdrop-blur-xl"}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.22em] text-pink-400">การชำระเงิน SurpriseQR</p>
            <h2 className="mt-1 text-2xl font-black text-white">{step === "amount" ? "เลือกแพ็กเกจ" : step === "method" ? "เลือกวิธีชำระเงิน" : step === "confirm" ? "ยืนยันการชำระเงิน" : step === "submitted" ? "ดำเนินการสำเร็จ" : "รอการชำระเงิน"}</h2>
          </div>
          {!embedded && <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-full p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>}
        </div>

        {step === "submitted" ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">⏳</div>
              <h3 className="mt-4 text-xl font-black text-white">{message === "ซื้อแพ็กเกจสำเร็จแล้ว" ? "ซื้อแพ็กเกจสำเร็จแล้ว!" : "ส่งหลักฐานการชำระเงินเรียบร้อยแล้ว!"}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{message === "ซื้อแพ็กเกจสำเร็จแล้ว" ? "สิทธิ์แพ็กเกจของคุณพร้อมใช้งานแล้ว" : "ระบบได้รับข้อมูลเรียบร้อยแล้ว อยู่ระหว่างผู้ดูแลระบบตรวจสอบยอดเงิน"}</p>
            </div>
            <div className={`glass-panel space-y-3 rounded-2xl bg-white/5 p-5 text-sm text-slate-300 ${embedded ? "border border-sky-400/30" : "border-space-border"}`}>
              <div className="flex items-center justify-between gap-4"><span className="text-slate-300">ยอดเงินที่แจ้งโอน</span><strong className="text-lg text-white font-semibold">฿{selectedAmount.toFixed(2)} บาท</strong></div>
              <div className="flex items-center justify-between gap-4"><span>สถานะปัจจุบัน</span><strong className={message === "ซื้อแพ็กเกจสำเร็จแล้ว" ? "text-emerald-700" : "text-amber-700"}>{message === "ซื้อแพ็กเกจสำเร็จแล้ว" ? "อนุมัติสำเร็จ" : "รอผู้ดูแลตรวจสอบ"}</strong></div>
              <div className="flex items-center justify-between gap-4"><span className="text-slate-300">วันเวลาที่ทำรายการ</span><strong className="text-right text-white font-semibold">{submittedAt?.toLocaleString("th-TH")}</strong></div>
            </div>
            <div className="rounded-2xl border border-sky-300/20 bg-sky-400/10 p-4 text-sm leading-6 text-sky-300">{message === "ซื้อแพ็กเกจสำเร็จแล้ว" ? "สิทธิ์จัดเก็บถาวรและเทมเพลตพรีเมียมถูกเพิ่มให้บัญชีแล้ว" : "เมื่อได้รับการอนุมัติ สิทธิ์แพ็กเกจจะถูกเพิ่มบนแดชบอร์ดโดยอัตโนมัติ"}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/dashboard" className="btn-gradient rounded-xl px-4 py-3 text-center font-bold text-white">ไปที่แดชบอร์ด</Link>
              <button type="button" onClick={resetModal} className={`rounded-xl border bg-white/10 px-4 py-3 font-bold text-slate-200 hover:bg-white/20 hover:text-white ${embedded ? "border-pink-400/30" : "border-space-border"}`}>ทำรายการเติมเงินใหม่</button>
            </div>
          </div>
        ) : step === "confirm" && selectedPackage ? (
          <div className="space-y-5">
            <div className={`glass-panel rounded-2xl bg-white/5 p-5 ${embedded ? "border border-fuchsia-400/30" : "border-space-border"}`}><p className="text-sm text-slate-400">ยืนยันการซื้อแพ็กเกจ</p><h3 className="mt-1 text-xl font-black text-white">{selectedPackage.name}</h3><div className="mt-4 space-y-2 text-sm text-slate-300"><p className="flex justify-between"><span>ราคา</span><strong>{selectedPackage.price} บาท</strong></p><p className="flex justify-between"><span>ยอดเงินคงเหลือปัจจุบัน</span><strong>{walletBalance === null ? "กำลังตรวจสอบ..." : `${walletBalance.toFixed(2)} บาท`}</strong></p><p className="flex justify-between border-t border-space-border pt-2"><span>ยอดคงเหลือหลังซื้อโดยประมาณ</span><strong>{walletBalance === null ? "กำลังคำนวณ..." : `${Math.max(0, walletBalance - selectedPackage.price).toFixed(2)} บาท`}</strong></p></div></div>
            <div className="flex gap-3"><button type="button" onClick={() => setStep("method")} className="flex-1 rounded-xl border border-space-border bg-white/10 px-4 py-3 font-bold text-slate-200 transition-colors hover:bg-white/20">ยกเลิก</button><button type="button" onClick={() => void payWithWallet()} disabled={loading || walletBalance === null || walletBalance < selectedPackage.price} className="btn-gradient flex-1 rounded-xl px-4 py-3 font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">ยืนยันการชำระเงิน</button></div>
            {walletBalance !== null && walletBalance < selectedPackage.price && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">ยอดเงินคงเหลือไม่พอสำหรับซื้อแพ็กเกจนี้</p>}
          </div>
        ) : step === "method" && selectedPackage ? (
          <div className="space-y-5">
            <div className="bg-purple-950/40 border border-purple-800/40 rounded-2xl p-4 mb-5 text-white"><p className="text-sm text-slate-400">แพ็กเกจที่เลือก</p><h3 className="mt-1 text-xl font-black text-white">{selectedPackage.name} ฿{selectedPackage.price}</h3></div>
            <button type="button" onClick={requestWalletConfirmation} disabled={loading} className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-purple-900/40 bg-[#120a21]/90 p-5 text-left shadow-lg backdrop-blur-xl transition-all duration-200 hover:border-purple-500/60 hover:shadow-purple-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50"><Wallet className="h-6 w-6 shrink-0 text-purple-300" /><span className="flex-1 text-white font-bold text-base sm:text-lg">ชำระด้วยยอดเงินคงเหลือ<span className="mt-1 block text-slate-300 text-xs sm:text-sm font-normal">ยอดเงินคงเหลือ: {walletBalance === null ? "กำลังตรวจสอบ..." : <span className="text-emerald-400 font-mono font-semibold">฿{walletBalance.toFixed(2)}</span>}</span></span><CheckCircle2 className="h-5 w-5 shrink-0 border-purple-500 bg-purple-500/20 text-purple-300 transition-colors group-hover:text-purple-200" /></button>
            {error && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">{error}</p>}
            <button type="button" onClick={() => { setError(null); setFile(null); setSecondsLeft(600); setStep("qr"); }} className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-purple-900/40 bg-[#120a21]/90 p-5 text-left shadow-lg backdrop-blur-xl transition-all duration-200 hover:border-purple-500/60 hover:shadow-purple-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"><QrCode className="h-6 w-6 shrink-0 text-purple-300" /><span className="flex-1 text-white font-bold text-base sm:text-lg">สแกนจ่ายด้วย PromptPay<span className="mt-1 block text-slate-300 text-xs sm:text-sm font-normal">แนบหลักฐานการโอน / สลิป</span></span><CheckCircle2 className="h-5 w-5 shrink-0 border-purple-500 bg-purple-500/20 text-purple-300 transition-colors group-hover:text-purple-200" /></button>
            <button type="button" onClick={() => setStep("amount")} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-purple-400 transition-colors hover:text-purple-300">กลับไปเลือกแพ็กเกจ</button>
          </div>
        ) : step === "amount" ? (
          <div className="space-y-5">
            <div className={`glass-panel rounded-2xl bg-white/5 p-5 ${embedded ? "border border-fuchsia-400/30" : "border-space-border"}`}>
              <ol className="space-y-3 text-sm font-medium text-slate-200">
                <li><b className="mr-2 text-pink-400 font-bold">1.</b>เลือกแพ็กเกจหรือกรอกจำนวนเงิน</li>
                <li><b className="mr-2 text-pink-400 font-bold">2.</b>สแกน QR Code</li>
                <li><b className="mr-2 text-pink-400 font-bold">3.</b>แนบสลิปเพื่อส่งตรวจสอบ</li>
              </ol>
            </div>
            <div className={`space-y-2 rounded-2xl border bg-red-400/10 p-4 text-sm font-semibold leading-6 text-red-200 ${embedded ? "border-red-300/40" : "border-red-300/20"}`}>
              <p>⚠️ QR Code ใช้ได้ครั้งเดียวเท่านั้น - ห้ามสแกนโอนซ้ำ</p>
              <p>⚠️ ต้องโอนตรงตามยอดที่ระบุเท่านั้น - ห้ามโอนผิดจำนวน</p>
              <p>⚠️ QR มีอายุ 10 นาที - หากหมดเวลาให้กดสร้าง QR ใหม่</p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch">
              {visiblePackages.map((pkg) => <button key={pkg.id} type="button" onClick={() => choosePackage(pkg)} className={`group relative flex min-h-full flex-col justify-between rounded-3xl border p-6 sm:p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/50 hover:shadow-purple-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 ${pkg.highlighted ? "border-purple-400/50 bg-gradient-to-b from-purple-900/40 to-[#120a21]/95 shadow-xl shadow-purple-950/40" : "border-purple-900/40 bg-[#120a21]/90 backdrop-blur-xl"} ${selectedPackage?.id === pkg.id ? "ring-2 ring-purple-500/80 shadow-2xl shadow-purple-950/50" : ""}`}>
                <span className={`mb-3 inline-flex self-start rounded-full border px-3 py-1 text-xs font-semibold ${currentTier === pkg.tierKey ? "border-emerald-400/40 bg-emerald-400/20 text-emerald-300" : "border-purple-500/30 bg-purple-500/20 text-purple-300"}`}>{currentTier === pkg.tierKey ? "แพ็กเกจปัจจุบันของคุณ" : pkg.badge}{selectedPackage?.id === pkg.id && <Check className="ml-1 h-3.5 w-3.5" />}</span>
                <strong className="text-xl font-bold text-white sm:text-2xl">{pkg.name}</strong>
                <span className="my-3 flex items-baseline gap-1 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.35)] text-4xl font-extrabold font-mono tracking-tight sm:text-5xl lg:text-6xl"><span className="text-2xl font-bold opacity-90 sm:text-3xl">฿</span>{pkg.price}</span>
                <span className="my-4 space-y-3 text-xs text-slate-300 sm:text-sm">{getPackageFeatures(pkg, currentTier).map((feature) => <span key={feature} className="flex items-start"><CheckCircle2 className="mr-2 mt-0.5 inline-block h-4 w-4 shrink-0 text-emerald-400" />{feature}</span>)}</span>
                <span className="mt-auto w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-purple-900/30 transition-all duration-200 active:scale-95 hover:from-purple-500 hover:to-pink-500">เลือกแพ็กเกจนี้</span>
              </button>)}
            </div>
            <p className="rounded-2xl border border-white/10 bg-[#120a21]/80 px-5 py-3 text-xs leading-5 text-slate-400 sm:text-sm">{STACKING_FOOTNOTE}</p>
            <div className="rounded-2xl border border-white/10 bg-[#120a21]/80 p-6 text-white">
              <label className="block text-sm font-semibold text-slate-200">หรือระบุจำนวนเงินเอง (เติมเท่าไหร่ ได้เท่านั้น 1:1)
                <input type="number" min="1" step="0.01" value={customAmount} onChange={(event) => { setCustomAmount(event.target.value); setError(null); }} className="mt-2 w-full rounded-xl border border-white/10 bg-[#120a21]/80 px-4 py-3 text-white outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" placeholder="จำนวนเงินบาท" />
              </label>
            </div>
            {error && <p className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</p>}
            <button type="button" onClick={createQr} disabled={!Number.isFinite(selectedAmount) || selectedAmount < 1} className="btn-gradient w-full rounded-xl px-4 py-3.5 font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40">สร้าง QR Code</button>
          </div>
        ) : expired ? (
          <div className="space-y-5 py-12 text-center">
            <p className="text-xl font-bold text-red-700">⌛ QR Code หมดอายุแล้ว</p>
            <button type="button" onClick={resetModal} className="btn-gradient rounded-xl px-5 py-3 font-bold text-white">สร้าง QR Code ใหม่</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 px-6 sm:px-12">
            <div className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-300 backdrop-blur-md rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-semibold">รอการชำระเงิน</span>
              <span className="text-amber-400 font-bold font-mono text-base lg:text-lg flex items-center gap-2"><Clock3 className="h-5 w-5" />เหลือเวลา {minutes}:{seconds} นาที</span>
            </div>
            <div className="w-full bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-4 text-center my-4 text-xs sm:text-sm font-medium">ห้ามใช้ QR Code เดิมซ้ำ - 1 QR Code ต่อการโอน 1 ครั้งเท่านั้น</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full bg-[#120a21]/90 border border-purple-900/40 rounded-3xl p-8 backdrop-blur-xl shadow-2xl shadow-purple-950/50">
              <div className="flex flex-col items-center justify-center text-center">
                <p className="mb-4 text-sm font-bold tracking-[0.18em] text-slate-300">คิวอาร์โค้ดพร้อมเพย์</p>
                <QRCodeSVG ref={qrRef} value={payload} size={240} className="mx-auto" />
              </div>
              <div className="space-y-4 text-center md:text-left">
                <p className="text-emerald-400 font-extrabold text-3xl sm:text-4xl my-4 tracking-wide">ยอดชำระ: ฿{selectedAmount.toFixed(2)} บาท</p>
                <p className="text-slate-300 text-sm">ชื่อบัญชี: นาย สิริวิชญ์ ยงบรรทม</p>
                <button type="button" onClick={downloadQr} className="w-full sm:w-auto min-w-[220px] bg-white/10 hover:bg-white/20 border border-white/20 py-3 px-8 rounded-xl font-semibold transition-all duration-200 active:scale-95 text-white flex items-center justify-center gap-2 mx-auto md:mx-0"><Download className="h-4 w-4" />ดาวน์โหลด QR Code</button>
              </div>
            </div>
            <button type="button" onClick={() => setStep("amount")} className="text-purple-400 hover:text-purple-300 text-sm font-medium inline-flex items-center gap-1 transition-colors">← เปลี่ยนจำนวนเงิน</button>
            <label className={`block rounded-2xl border-2 border-dashed bg-white/5 p-6 text-center text-sm text-slate-300 hover:border-space-accent ${embedded ? "border-pink-400/40" : "border-space-border"}`}><UploadCloud className="mx-auto mb-2 h-8 w-8 text-space-accent" />{file?.name || "เลือกสลิป JPG, PNG หรือ WEBP"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="hidden" /></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="claimed_transfer_time" className="mb-1 block text-xs font-semibold text-slate-300">เวลาที่โอนเงิน <span className="text-rose-400">*</span></label>
                <input id="claimed_transfer_time" name="claimed_transfer_time" type="datetime-local" required value={transferTime} onChange={(event) => setTransferTime(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-space-accent [color-scheme:dark]" />
                <p className="mt-1 text-[11px] text-slate-400">ระบุวัน-เวลาที่คุณโอนเงินจริง (ใช้ตรวจสอบกับสลิป)</p>
              </div>
              <div>
                <label htmlFor="claimed_bank_account_last4" className="mb-1 block text-xs font-semibold text-slate-300">เลขท้ายบัญชีที่ใช้โอน 4 หลัก <span className="text-rose-400">*</span></label>
                <input id="claimed_bank_account_last4" name="claimed_bank_account_last4" type="text" inputMode="numeric" maxLength={4} placeholder="เช่น 1234" required value={last4} onChange={(event) => setLast4(event.target.value.replace(/[^0-9]/g, "").slice(0, 4))} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-space-accent" />
                <p className="mt-1 text-[11px] text-slate-400">เฉพาะตัวเลข 4 หลักท้ายของบัญชีผู้โอน</p>
              </div>
            </div>
            {error && <p className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</p>}
            {message && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"><Check className="h-4 w-4" />{message}</p>}
            <button type="submit" disabled={!file || loading || !transferTime || last4.trim().length !== 4} className="btn-gradient w-full rounded-xl px-4 py-3.5 font-bold text-white shadow-lg disabled:opacity-50">{loading ? "กำลังส่ง..." : "ส่งสลิปชำระเงิน"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

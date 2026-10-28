"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, UploadCloud, AlertCircle, Check, Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadPaymentSlip } from "@/lib/storage-client";

import { PRICING_PACKAGES, getPackageFeatures, STACKING_FOOTNOTE, type PricingPackage } from "@/lib/packages";

interface TopupFormProps {
  userId: string;
}

export default function TopupForm({ userId }: TopupFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [selectedPackage, setSelectedPackage] = useState<PricingPackage | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!file) {
      setError("กรุณาเลือกไฟล์สลิปชำระเงิน");
      return;
    }

    const amountToAdd = selectedPackage?.price || parseFloat(customAmount);
    if (!amountToAdd || amountToAdd <= 0) {
      setError("กรุณาเลือกแพ็กเกจหรือกรอกจำนวนเงินที่ถูกต้อง");
      return;
    }

    setLoading(true);

    // Upload payment slip using storage utility
    const { url: slipUrl, error: uploadError } = await uploadPaymentSlip(file, userId);
    
    if (uploadError) {
      setLoading(false);
      setError(uploadError);
      return;
    }

    const amount = amountToAdd;
    
    const { error: insertError } = await supabase.from("payments").insert({
      user_id: userId,
      slip_url: slipUrl,
      amount: amount,
      credits_granted: amount,
      // Attach the selected package code so admin approval grants the correct
      // package entitlements (starter_69 / value_119 / pro_199 / god_269).
      ...(selectedPackage ? { package_type: selectedPackage.id } : {}),
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSelectedPackage(null);
    setCustomAmount("");
    setFile(null);
    setMessage("ส่งสลิปชำระเงินแล้ว รอการอนุมัติจากผู้ดูแล");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Pricing Packages */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-500" />
          เลือกแพ็กเกจ
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRICING_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => {
                setSelectedPackage(pkg);
                setCustomAmount("");
              }}
              className={`relative p-4 rounded-2xl border-2 transition-all ${
                selectedPackage?.id === pkg.id
                  ? "border-space-accent glass-panel shadow-lg shadow-space-accent/20"
                  : pkg.highlighted
                    ? "border-purple-400/50 glass-panel hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/20"
                    : "border-space-border glass-panel hover:border-space-accent/50 hover:shadow-md"
              }`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${
                pkg.highlighted
                  ? "bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 shadow-purple-500/30"
                  : "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900"
              }`}>{pkg.badge}</span></div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{pkg.name}</p>
                <p className="text-3xl font-bold text-space-accent my-2">฿{pkg.price}</p>
                <ul className="mt-3 space-y-1 text-left text-xs font-medium leading-5 text-slate-400">{getPackageFeatures(pkg).map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
                <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white">เลือกแพ็กเกจนี้</p>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-5 text-slate-400 sm:text-sm">{STACKING_FOOTNOTE}</p>
      </section>

      {/* Custom Amount */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">หรือกรอกจำนวนเงินที่ต้องการ</h2>
        <div>
          <label htmlFor="custom-credits" className="block text-sm font-medium text-slate-300 mb-2">
            จำนวนเงินที่ต้องการเติม
          </label>
          <input
            id="custom-credits"
            type="number"
            min="1"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setSelectedPackage(null);
            }}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-space-accent/30 transition-all"
            placeholder="กรอกจำนวนเงิน (บาท)"
          />
        </div>
      </section>

      {/* Payment Slip Upload */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-space-accent" />
          อัปโหลดสลิปชำระเงิน
        </h2>
        <div className="border-2 border-dashed border-space-border hover:border-space-accent/50 bg-white/5 hover:bg-white/10 rounded-2xl p-6 transition-all text-center cursor-pointer">
          <input
            id="slip"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
            className="hidden"
          />
          <label htmlFor="slip" className="cursor-pointer">
            <UploadCloud className="w-12 h-12 mx-auto mb-3 text-space-accent" />
            <p className="text-slate-400 font-medium">
              {file ? file.name : "คลิกเพื่ออัปโหลดหรือลากไฟล์มาวาง"}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              PNG, JPG, WEBP, PDF สูงสุด 10MB
            </p>
          </label>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-xl">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {message && (
        <div className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-500/30 p-3 rounded-xl">
          <Check className="w-5 h-5" />
          <p className="text-sm">{message}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Crown className="w-5 h-5" />
        {loading ? "กำลังส่ง..." : "ส่งสลิปชำระเงิน"}
      </button>
    </form>
  );
}

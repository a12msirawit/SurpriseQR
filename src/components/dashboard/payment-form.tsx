"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, UploadCloud, AlertCircle, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PaymentForm() {
  const router = useRouter();
  const supabase = createClient();
  const [amount, setAmount] = useState("");
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

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("กรุณากรอกจำนวนเงินที่ถูกต้องมากกว่า 0");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError("คุณต้องเข้าสู่ระบบเพื่อส่งสลิปชำระเงิน");
      return;
    }

    const ext = file.name.split(".").pop() ?? "png";
    const filePath = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("slips")
      .upload(filePath, file);

    if (uploadError) {
      setLoading(false);
      setError(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("slips").getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("payments").insert({
      user_id: user.id,
      slip_url: publicUrl,
      amount: parsedAmount,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setAmount("");
    setFile(null);
    setMessage("ส่งสลิปชำระเงินแล้ว รอการอนุมัติจากผู้ดูแล");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="amount" className="mb-2 block text-base font-bold text-slate-300">
          จำนวนเงิน
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-space-accent/30 focus:border-transparent transition-all"
          placeholder="0.00"
        />
      </div>
      
      <div>
        <label htmlFor="slip" className="mb-2 block text-base font-bold text-slate-300">
          สลิปชำระเงิน
        </label>
        <div className="glass-panel border-2 border-dashed border-space-border hover:border-space-accent bg-white/5 hover:bg-space-accent/10 rounded-2xl p-6 transition-all text-center cursor-pointer">
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
            <p className="text-slate-300 font-medium">
              {file ? file.name : "คลิกเพื่ออัปโหลดหรือลากไฟล์มาวาง"}
            </p>
            <p className="mt-1 text-base font-medium text-slate-400">
              PNG, JPG, WEBP, PDF สูงสุด 10MB
            </p>
          </label>
        </div>
      </div>

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
        className="w-full px-6 py-3 rounded-xl font-bold btn-gradient text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
      >
        <Crown className="w-5 h-5" />
        {loading ? "กำลังส่ง..." : "ส่งสลิปชำระเงิน"}
      </button>
    </form>
  );
}

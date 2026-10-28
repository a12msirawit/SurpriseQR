"use client";

import { useState, useTransition, useEffect } from "react";
import { Check, X, Eye, ExternalLink, AlertCircle, Clock, Coins, ImageOff } from "lucide-react";
import { approvePayment, rejectPayment } from "@/app/admin/actions";
import type { Payment } from "@/types/database";

interface PendingPaymentsProps {
  payments: Payment[];
}

export default function PendingPayments({ payments }: PendingPaymentsProps) {
  const [error, setError] = useState<string | null>(null);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  function openPreview(url: string) {
    setPreview(url);
    setImageError(false);
  }

  function closePreview() {
    setPreview(null);
    setImageError(false);
  }

  // Close the preview modal with the Escape key.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePreview();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock body scroll while the preview modal is open.
  useEffect(() => {
    if (preview) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [preview]);

  function handleApprove(paymentId: string) {
    setError(null);
    setApprovalMessage(null);
    startTransition(async () => {
      const result = await approvePayment(paymentId);
      if (result.error) {
        setError(result.error);
        return;
      }
      // The fixed approve_payment_transaction RPC returns the grantee's
      // updated profile snapshot (credits / tier / package duration), so the
      // admin sees the resulting balance/top-up right on the approval row.
      if (result.credits !== undefined || result.tier !== undefined) {
        const tier = result.tier ? (result.tier.charAt(0).toUpperCase() + result.tier.slice(1)) : null;
        const credits = typeof result.credits === "number" ? Number(result.credits).toFixed(2) : null;
        setApprovalMessage(
          `อนุมัติสำเร็จ —${tier ? ` อัปเกรดเป็น ${tier}` : ""}${
            credits ? ` ยอดเครดิตคงเหลือ ฿${credits}` : ""
          }`,
        );
      }
    });
  }

  function handleReject(paymentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await rejectPayment(paymentId);
      if (result.error) setError(result.error);
    });
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Check className="w-16 h-16 mx-auto mb-4 text-slate-600" />
        <p>ยังไม่มีคำขอชำระเงินที่รอดำเนินการ</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-xl">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {approvalMessage && (
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl">
          <Check className="w-5 h-5" />
          <p className="text-sm">{approvalMessage}</p>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-space-border">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">รหัสผู้ใช้</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">จำนวนเงิน</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">ยอดเงินที่จะเพิ่มเข้าบัญชี</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">สลิป</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">ส่งเมื่อ</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-space-border hover:bg-white/5">
                <td className="py-4 px-4 text-sm text-slate-300 font-mono">{payment.user_id}</td>
                <td className="py-4 px-4 text-sm text-white font-semibold">${payment.amount}</td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
                    <Coins className="w-3 h-3" />
                    ฿{Number(payment.amount).toFixed(2)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <button
                    type="button"
                    onClick={() => openPreview(payment.slip_url)}
                    className="inline-flex items-center gap-1 text-fuchsia-400 hover:text-fuchsia-300 text-sm font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    ดูสลิป
                  </button>
                </td>
                <td className="py-4 px-4 text-sm text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {new Date(payment.created_at).toLocaleString()}
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleApprove(payment.id)}
                      className="px-4 py-2 rounded-xl font-semibold text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      อนุมัติ
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleReject(payment.id)}
                      className="px-4 py-2 rounded-xl font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      ปฏิเสธ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ดูสลิปชำระเงิน"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={closePreview}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl w-full flex items-center justify-center rounded-xl bg-[#120a21] border border-white/10 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closePreview}
              aria-label="ปิด"
              className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
            >
              <X className="h-5 w-5" />
            </button>
            {imageError ? (
              <div className="flex flex-col items-center gap-3 p-12 text-center">
                <ImageOff className="h-12 w-12 text-slate-500" />
                <p className="text-sm text-slate-400">
                  ไม่สามารถแสดงสลิปได้ หรือไฟล์อาจถูกลบไปแล้ว
                </p>
                <a
                  href={preview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 px-4 py-2 text-sm font-medium text-fuchsia-300 transition-colors hover:bg-fuchsia-500/20"
                >
                  <ExternalLink className="w-4 h-4" />
                  เปิดสลิปในแท็บใหม่
                </a>
              </div>
            ) : (
              <img
                src={preview}
                alt="สลิปชำระเงิน"
                onError={() => setImageError(true)}
                className="max-h-[85vh] max-w-full rounded-xl object-contain p-2"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

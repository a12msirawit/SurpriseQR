"use client";

import { useState } from "react";
import { Check, Eye, X } from "lucide-react";
import type { Payment } from "@/types/database";

export default function PaymentBackoffice({ payments }: { payments: Payment[] }) {
  const [items, setItems] = useState(payments);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  async function act(paymentId: string, action: "approve" | "reject") {
    setBusy(paymentId);
    setError(null);
    setApprovalMessage(null);
    const reason = action === "reject" ? window.prompt("เหตุผลที่ปฏิเสธ (ไม่บังคับ)") : undefined;
    if (action === "reject" && reason === null) { setBusy(null); return; }
    const response = await fetch(`/api/admin/payments/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId, reason }) });
    const data = await response.json();
    setBusy(null);
    if (!response.ok) { setError(data.error || "ดำเนินการไม่สำเร็จ"); return; }
    setItems((current) => current.filter((item) => item.id !== paymentId));
    // The approve RPC (20260827000004) returns the grantee's updated profile —
    // display the resulting balance / tier / package duration for the admin.
    if (action === "approve") {
      const tier = data.tier ? (String(data.tier).charAt(0).toUpperCase() + String(data.tier).slice(1)) : null;
      const credits = data.credits != null ? `฿${Number(data.credits).toFixed(2)}` : null;
      setApprovalMessage(
        `อนุมัติสำเร็จ —${tier ? ` อัปเกรดเป็น ${tier}` : ""}${
          credits ? ` ยอดเครดิตคงเหลือ ${credits}` : ""
        }`,
      );
    }
  }

  return <div className="space-y-4">
    {error && <p className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">{error}</p>}
    {approvalMessage && <p className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-400">{approvalMessage}</p>}
    {items.length === 0 ? <p className="py-10 text-center text-slate-400">ไม่มีรายการรอตรวจสอบ</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-space-border"><th className="p-3 text-slate-300">วันที่</th><th className="p-3 text-slate-300">ผู้ใช้</th><th className="p-3 text-slate-300">ยอดเงิน</th><th className="p-3 text-slate-300">ยอดเงินที่จะเติม</th><th className="p-3 text-slate-300">เวลาที่แจ้งโอน</th><th className="p-3 text-slate-300">เลขท้ายบัญชี</th><th className="p-3 text-slate-300">สลิป</th><th className="p-3 text-slate-300">จัดการ</th></tr></thead><tbody>{items.map((payment) => <tr key={payment.id} className="border-b border-space-border hover:bg-white/5"><td className="p-3 text-slate-300">{new Date(payment.created_at).toLocaleString("th-TH")}</td><td className="p-3 font-mono text-xs text-slate-400">{payment.user_id}</td><td className="p-3 text-slate-200">฿{Number(payment.amount).toFixed(2)}</td><td className="p-3 font-semibold text-emerald-400">฿{Number(payment.amount).toFixed(2)}</td><td className="p-3 text-xs text-slate-400">{payment.claimed_transfer_time ? new Date(payment.claimed_transfer_time).toLocaleString("th-TH") : "—"}</td><td className="p-3 font-mono text-slate-400">{payment.claimed_bank_account_last4 ? `xxx-x-x•••-${payment.claimed_bank_account_last4}` : "—"}</td><td className="p-3"><button type="button" onClick={() => setPreview(payment.slip_url)} className="inline-flex items-center gap-1 text-fuchsia-400 hover:text-fuchsia-300"><Eye className="h-4 w-4" />ดูสลิป</button></td><td className="p-3"><div className="flex gap-2"><button type="button" disabled={busy === payment.id} onClick={() => void act(payment.id, "approve")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-emerald-400 transition-colors duration-200 hover:bg-emerald-500/20 disabled:opacity-50"><Check className="h-4 w-4" />อนุมัติ</button><button type="button" disabled={busy === payment.id} onClick={() => void act(payment.id, "reject")} className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-red-400 transition-colors duration-200 hover:bg-red-500/20 disabled:opacity-50"><X className="h-4 w-4" />ปฏิเสธ</button></div></td></tr>)}</tbody></table></div>}
    {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setPreview(null)}><div className="relative max-h-[90vh] max-w-4xl" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setPreview(null)} className="absolute right-2 top-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X className="h-4 w-4" /></button><img src={preview} alt="Payment slip" className="max-h-[85vh] max-w-full rounded-xl object-contain" /></div></div>}
  </div>;
}

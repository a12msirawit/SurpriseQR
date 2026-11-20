"use client";

import { useMemo, useState } from "react";
import { Check, Eye, ImageOff, Search, Trash2, X } from "lucide-react";
import type { Payment, PaymentStatus } from "@/types/database";

type StatusFilter = "all" | PaymentStatus;

interface PaymentBackofficeProps {
  payments: Payment[];
  userEmails?: Record<string, string>;
}

const STATUS_BADGE: Record<PaymentStatus, { label: string; className: string }> = {
  pending: {
    label: "รอตรวจสอบ",
    className: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  },
  approved: {
    label: "อนุมัติแล้ว",
    className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  },
  rejected: {
    label: "ปฏิเสธ",
    className: "border-rose-500/30 bg-rose-500/15 text-rose-300",
  },
};

export default function PaymentBackoffice({
  payments,
  userEmails = {},
}: PaymentBackofficeProps) {
  const [items, setItems] = useState(payments);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [userQuery, setUserQuery] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const item of items) {
      if (item.status === "pending") pending += 1;
      else if (item.status === "approved") approved += 1;
      else if (item.status === "rejected") rejected += 1;
    }
    return { all: items.length, pending, approved, rejected };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      const email = (userEmails[item.user_id] ?? "").toLowerCase();
      return item.user_id.toLowerCase().includes(q) || email.includes(q);
    });
  }, [items, statusFilter, userQuery, userEmails]);

  async function act(paymentId: string, action: "approve" | "reject") {
    setBusy(paymentId);
    setError(null);
    setNotice(null);
    const reason = action === "reject" ? window.prompt("เหตุผลที่ปฏิเสธ (ไม่บังคับ)") : undefined;
    if (action === "reject" && reason === null) {
      setBusy(null);
      return;
    }

    const response = await fetch(`/api/admin/payments/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, reason }),
    });
    const data = await response.json();
    setBusy(null);
    if (!response.ok) {
      setError(data.error || "ดำเนินการไม่สำเร็จ");
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === paymentId
          ? {
              ...item,
              status: action === "approve" ? "approved" : "rejected",
              reject_reason: action === "reject" ? reason || null : item.reject_reason,
              approved_at: action === "approve" ? new Date().toISOString() : item.approved_at,
            }
          : item,
      ),
    );

    if (action === "approve") {
      const tier = data.tier
        ? String(data.tier).charAt(0).toUpperCase() + String(data.tier).slice(1)
        : null;
      const credits = data.credits != null ? `฿${Number(data.credits).toFixed(2)}` : null;
      setNotice(
        `อนุมัติสำเร็จ —${tier ? ` อัปเกรดเป็น ${tier}` : ""}${
          credits ? ` ยอดเครดิตคงเหลือ ${credits}` : ""
        }`,
      );
    } else {
      setNotice("ปฏิเสธรายการชำระเงินเรียบร้อยแล้ว");
    }
  }

  async function handleDelete(paymentId: string, mode: "slip_only" | "record") {
    const confirmText =
      mode === "slip_only"
        ? "ต้องการลบรูปสลิปออกจาก Storage (แต่ยังเก็บประวัติตัวเลขไว้) ใช่หรือไม่?"
        : "ต้องการลบประวัตินี้และรูปสลิปออกถาวรใช่หรือไม่?";
    if (!window.confirm(confirmText)) return;

    setBusy(paymentId);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/admin/payments/${paymentId}?mode=${mode}`, {
      method: "DELETE",
    });
    const data = await response.json();
    setBusy(null);

    if (!response.ok) {
      setError(data.error || "ลบข้อมูลไม่สำเร็จ");
      return;
    }

    if (mode === "slip_only") {
      setItems((current) =>
        current.map((item) => (item.id === paymentId ? { ...item, slip_url: "" } : item)),
      );
      setNotice("ลบรูปสลิปออกจาก Storage แล้ว (ประวัติรายการยังคงอยู่)");
    } else {
      setItems((current) => current.filter((item) => item.id !== paymentId));
      setNotice("ลบรายการและรูปสลิปเรียบร้อยแล้ว");
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter & Per-User Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: `ทั้งหมด (${counts.all})` },
              { id: "pending", label: `รอตรวจสอบ (${counts.pending})` },
              { id: "approved", label: `อนุมัติแล้ว (${counts.approved})` },
              { id: "rejected", label: `ปฏิเสธ (${counts.rejected})` },
            ] as Array<{ id: StatusFilter; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                statusFilter === tab.id
                  ? "border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-200"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="ค้นหาอีเมล หรือ รหัสผู้ใช้..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-400 outline-none focus:border-fuchsia-400"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          {notice}
        </p>
      )}

      {filteredItems.length === 0 ? (
        <p className="py-10 text-center text-slate-400">ไม่พบรายการชำระเงิน</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-space-border">
                <th className="p-3 text-slate-300">วันที่</th>
                <th className="p-3 text-slate-300">ผู้ใช้</th>
                <th className="p-3 text-slate-300">ยอดเงิน</th>
                <th className="p-3 text-slate-300">สถานะ</th>
                <th className="p-3 text-slate-300">สลิป</th>
                <th className="p-3 text-slate-300">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((payment) => {
                const badge = STATUS_BADGE[payment.status];
                const email = userEmails[payment.user_id];
                return (
                  <tr key={payment.id} className="border-b border-space-border hover:bg-white/5">
                    <td className="whitespace-nowrap p-3 text-xs text-slate-300">
                      {new Date(payment.created_at).toLocaleString("th-TH")}
                    </td>
                    <td className="p-3">
                      {email ? (
                        <p className="text-xs font-medium text-slate-100">{email}</p>
                      ) : (
                        <p className="font-mono text-[11px] text-slate-400">{payment.user_id}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap p-3 font-semibold text-emerald-400">
                      ฿{Number(payment.amount).toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {payment.status === "rejected" && payment.reject_reason && (
                        <p className="mt-1 text-[11px] text-rose-300/80">
                          {payment.reject_reason}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap p-3">
                      {payment.slip_url ? (
                        <button
                          type="button"
                          onClick={() => setPreview(payment.slip_url)}
                          className="inline-flex items-center gap-1 text-fuchsia-400 hover:text-fuchsia-300"
                        >
                          <Eye className="h-4 w-4" />
                          ดูสลิป
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <ImageOff className="h-3.5 w-3.5" />
                          ลบรูปแล้ว
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {payment.status === "pending" && (
                          <>
                            <button
                              type="button"
                              disabled={busy === payment.id}
                              onClick={() => void act(payment.id, "approve")}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              อนุมัติ
                            </button>
                            <button
                              type="button"
                              disabled={busy === payment.id}
                              onClick={() => void act(payment.id, "reject")}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" />
                              ปฏิเสธ
                            </button>
                          </>
                        )}
                        {payment.status !== "pending" && payment.slip_url && (
                          <button
                            type="button"
                            disabled={busy === payment.id}
                            onClick={() => void handleDelete(payment.id, "slip_only")}
                            title="ลบรูปสลิปออกจาก Storage แต่เก็บประวัติไว้"
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
                          >
                            <ImageOff className="h-3.5 w-3.5" />
                            ลบรูปสลิป
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy === payment.id}
                          onClick={() => void handleDelete(payment.id, "record")}
                          title="ลบรายการและรูปสลิปถาวร"
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute right-2 top-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Payment slip"
              className="max-h-[85vh] max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

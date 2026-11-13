"use client";

import { History, Sparkles } from "lucide-react";
import type { Payment } from "@/types/database";

export interface TopupHistoryItem {
  id: string;
  date: string;
  channel: string;
  amount: string;
  status: Payment["status"];
  isNew?: boolean;
}

function StatusBadge({ status }: { status: Payment["status"] }) {
  const successStatuses = ["approved", "completed", "success"];
  const failureStatuses = ["rejected", "failed"];

  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 px-3 py-1 text-xs font-semibold text-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        รอตรวจสอบ
      </span>
    );
  }

  if (successStatuses.includes(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        สำเร็จ
      </span>
    );
  }

  if (failureStatuses.includes(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-400/10 border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-300">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        ไม่สำเร็จ
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-400/10 border border-purple-400/30 px-3 py-1 text-xs font-semibold text-purple-300">
      {status}
    </span>
  );
}

interface TopupHistoryTableProps {
  items: TopupHistoryItem[];
  highlightId?: string | null;
}

export default function TopupHistoryTable({ items, highlightId }: TopupHistoryTableProps) {
  return (
    <section
      id="topup-history"
      className="w-full mt-8 bg-[#120a21]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-md shadow-xl scroll-mt-24 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base lg:text-lg font-bold text-white flex items-center gap-2">
          <History className="h-5 w-5 text-purple-400 inline mr-2" />
          ประวัติการทำรายการเติมเงิน
        </h2>
        {highlightId && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 px-3 py-1 text-xs font-bold text-fuchsia-300 animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            มีรายการใหม่ล่าสุด
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="min-w-full table-fixed">
          <thead className="bg-purple-950/40 text-purple-200 text-xs font-semibold">
            <tr>
              <th className="border-b border-white/10 px-4 py-3 text-left font-semibold">
                วันที่เติม
              </th>
              <th className="border-b border-white/10 px-4 py-3 text-left font-semibold">
                ช่องทาง
              </th>
              <th className="border-b border-white/10 px-4 py-3 text-right font-semibold">
                จำนวนเงิน
              </th>
              <th className="border-b border-white/10 px-4 py-3 text-left font-semibold">
                สถานะ
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-slate-500 text-center py-6">
                  ยังไม่มีประวัติการทำรายการ
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const isHighlighted = item.id === highlightId || (item.isNew && index === 0);
                return (
                  <tr
                    key={item.id}
                    id={`history-row-${item.id}`}
                    className={`border-b border-white/5 transition-all duration-300 ${
                      isHighlighted
                        ? "bg-fuchsia-500/15 border-l-4 border-l-fuchsia-400 shadow-inner"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-300 text-xs lg:text-sm font-mono">
                      <div className="flex items-center gap-2">
                        {isHighlighted && (
                          <span className="inline-block rounded-md bg-fuchsia-500 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                            ใหม่
                          </span>
                        )}
                        <span>{item.date}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-200 text-xs lg:text-sm">
                      {item.channel}
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-bold text-xs lg:text-sm text-right font-mono">
                      {item.amount}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

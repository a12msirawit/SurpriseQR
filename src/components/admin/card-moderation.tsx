"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { useRouter } from "next/navigation";

export interface AdminCardRow {
  id: string;
  email: string;
  title: string;
  previewPath: string;
  status: "active" | "hidden" | "flagged" | "draft" | "published" | string;
  created_at: string;
}

const STATUS_OPTIONS = ["active", "hidden", "flagged"] as const;

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  published: "bg-emerald-500/20 text-emerald-400",
  hidden: "bg-white/10 text-slate-400",
  flagged: "bg-red-500/20 text-red-400",
  draft: "bg-amber-500/20 text-amber-400",
};

export default function CardModeration({ cards }: { cards: AdminCardRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(cards);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (card) => card.email.toLowerCase().includes(q) || card.title.toLowerCase().includes(q),
    );
  }, [items, query]);

  async function changeStatus(card: AdminCardRow, status: string) {
    if (status === card.status) return;
    setBusy(card.id);
    setError(null);
    // Optimistic update; revert on failure.
    setItems((current) => current.map((item) => (item.id === card.id ? { ...item, status } : item)));
    try {
      const response = await fetch(`/api/admin/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "เปลี่ยนสถานะไม่สำเร็จ");
        setItems((current) => current.map((item) => (item.id === card.id ? { ...item, status: card.status } : item)));
        return;
      }
      router.refresh();
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่");
      setItems((current) => current.map((item) => (item.id === card.id ? { ...item, status: card.status } : item)));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาด้วยอีเมลเจ้าของหรือชื่อการ์ด..."
            className="w-full rounded-xl border border-space-border bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition-colors duration-200 focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20"
          />
        </div>
        <p className="text-xs text-slate-400">{filtered.length} จาก {items.length} การ์ด</p>
      </div>

      {error && <p className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-space-border">
              <th className="p-3 text-slate-300">เจ้าของ</th>
              <th className="p-3 text-slate-300">การ์ด</th>
              <th className="p-3 text-slate-300">วันที่สร้าง</th>
              <th className="p-3 text-slate-300">สถานะ</th>
              <th className="p-3 text-slate-300">พรีวิว</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-slate-400">ไม่พบการ์ด</td></tr>
            ) : filtered.map((card) => (
              <tr key={card.id} className="border-b border-space-border hover:bg-white/5">
                <td className="p-3 font-medium text-white">{card.email}</td>
                <td className="p-3 text-slate-300">{card.title}</td>
                <td className="p-3 text-xs text-slate-400">{new Date(card.created_at).toLocaleDateString("th-TH")}</td>
                <td className="p-3">
                  <span className={`mr-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLES[card.status] ?? "bg-white/10 text-slate-400"}`}>
                    {card.status}
                  </span>
                  <select
                    value={STATUS_OPTIONS.includes(card.status as "active") ? card.status : "active"}
                    disabled={busy === card.id}
                    onChange={(event) => void changeStatus(card, event.target.value)}
                    className="rounded-lg border border-space-border bg-white/5 px-2 py-1.5 text-xs text-white outline-none transition-colors duration-200 focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20 disabled:opacity-50"
                    aria-label={`เปลี่ยนสถานะการ์ด ${card.title}`}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option} className="bg-[#06030c]">{option}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  <a
                    href={card.previewPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-fuchsia-400 transition-colors duration-200 hover:text-fuchsia-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                    เปิดดู
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
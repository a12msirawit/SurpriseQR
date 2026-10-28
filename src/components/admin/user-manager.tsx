"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Search, Wallet } from "lucide-react";

export interface AdminUserRow {
  id: string;
  email: string;
  role: "user" | "admin";
  tier: string;
  credits: number;
  is_banned: boolean;
  created_at: string;
}

export default function UserManager({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Manual-credit modal state
  const [creditTarget, setCreditTarget] = useState<AdminUserRow | null>(null);
  const [creditAmount, setCreditAmount] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => user.email.toLowerCase().includes(q));
  }, [query, users]);

  async function toggleBan(user: AdminUserRow) {
    setBusy(user.id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, banned: !user.is_banned }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "ดำเนินการไม่สำเร็จ");
        return;
      }
      setMessage(`${!user.is_banned ? "ระงับ" : "ยกเลิกการระงับ"} ${user.email} สำเร็จ`);
      router.refresh();
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่");
    } finally {
      setBusy(null);
    }
  }

  async function submitCredit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!creditTarget) return;
    const amount = Number(creditAmount);
    if (!Number.isFinite(amount) || amount === 0) {
      setError("กรุณาระบุจำนวนเงิน (ไม่เป็นศูนย์)");
      return;
    }
    setBusy(creditTarget.id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: creditTarget.id, amount }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "ปรับยอดเงินไม่สำเร็จ");
        return;
      }
      setMessage(`ปรับยอดเงิน ${creditTarget.email} สำเร็จ (${amount > 0 ? "+" : ""}${amount})`);
      setCreditTarget(null);
      setCreditAmount("");
      router.refresh();
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาด้วยอีเมล..."
            className="w-full rounded-xl border border-space-border bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition-colors duration-200 focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20"
          />
        </div>
        <p className="text-xs text-slate-400">{filtered.length} จาก {users.length} ผู้ใช้</p>
      </div>

      {error && <p className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">{error}</p>}
      {message && <p className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-400">{message}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-space-border">
              <th className="p-3 text-slate-300">อีเมล</th>
              <th className="p-3 text-slate-300">Role</th>
              <th className="p-3 text-slate-300">Credits</th>
              <th className="p-3 text-slate-300">สถานะ</th>
              <th className="p-3 text-slate-300">สมัครเมื่อ</th>
              <th className="p-3 text-slate-300">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">ไม่พบผู้ใช้</td></tr>
            ) : filtered.map((user) => (
              <tr key={user.id} className="border-b border-space-border hover:bg-white/5">
                <td className="p-3 font-medium text-white">{user.email}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.role === "admin" ? "bg-purple-500/20 text-purple-300" : "bg-white/10 text-slate-300"}`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-3 font-mono text-slate-300">{Number(user.credits).toFixed(2)}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.is_banned ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                    {user.is_banned ? "Banned" : "Active"}
                  </span>
                </td>
                <td className="p-3 text-xs text-slate-400">{new Date(user.created_at).toLocaleDateString("th-TH")}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy === user.id}
                      onClick={() => void toggleBan(user)}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 disabled:opacity-50 transition-all ${user.is_banned ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" : "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"}`}
                    >
                      {user.is_banned ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                      {user.is_banned ? "Unban" : "Ban"}
                    </button>
                    <button
                      type="button"
                      disabled={busy === user.id}
                      onClick={() => { setCreditTarget(user); setCreditAmount(""); setError(null); setMessage(null); }}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-all"
                    >
                      <Wallet className="h-4 w-4" />
                      ปรับยอดเงิน
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setCreditTarget(null)}>
          <form onSubmit={(event) => void submitCredit(event)} className="w-full max-w-md rounded-2xl glass-panel p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-bold text-white">ปรับยอดเงิน (Manual Credit)</h2>
            <p className="mt-1 text-sm text-slate-400">{creditTarget.email}</p>
            <label htmlFor="credit_amount" className="mt-4 block text-xs font-semibold text-slate-300">
              จำนวนเงิน (ใส่ค่าติดลบเพื่อหักยอด)
            </label>
            <input
              id="credit_amount"
              name="credit_amount"
              type="number"
              step="0.01"
              min="-1000000"
              max="1000000"
              required
              autoFocus
              value={creditAmount}
              onChange={(event) => setCreditAmount(event.target.value)}
              placeholder="เช่น 100 หรือ -50"
              className="mt-1 w-full rounded-xl border border-space-border bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors duration-200 focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20"
            />
            <p className="mt-2 text-xs text-slate-400">เครดิตปัจจุบัน: {Number(creditTarget.credits).toFixed(2)}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCreditTarget(null)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 transition-all">
                ยกเลิก
              </button>
              <button type="submit" disabled={busy === creditTarget.id} className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-500 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 transition-all hover:from-fuchsia-600 hover:to-purple-600">
                {busy === creditTarget.id ? "กำลังบันทึก..." : "ยืนยัน"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, LogOut, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const supabase = createClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmOpen || signingOut) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirmOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmOpen, signingOut]);

  async function confirmLogout() {
    setSigningOut(true);
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      window.location.replace("/");
    } catch {
      setError("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setSigningOut(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setConfirmOpen(true); }}
        className="flex items-center gap-2 rounded-xl border border-space-border/50 bg-white/10 hover:bg-white/20 px-4 py-2.5 text-base font-semibold text-slate-200 transition-all"
      >
        <LogOut className="h-5 w-5" />
        ออกจากระบบ
      </button>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !signingOut) setConfirmOpen(false); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            className="w-full max-w-md rounded-3xl border border-purple-400/30 bg-[#10091b] p-6 text-slate-100 shadow-2xl shadow-black/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-400/10 text-rose-300">
                  <LogOut className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="logout-confirm-title" className="text-xl font-bold text-white">ยืนยันการออกจากระบบ</h2>
                  <p className="mt-1 text-sm text-slate-400">ต้องการออกจากบัญชีนี้ใช่ไหม?</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="ปิดหน้าต่าง"
                disabled={signingOut}
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={signingOut}
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={signingOut}
                onClick={() => void confirmLogout()}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-fuchsia-600 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
              >
                {signingOut ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                {signingOut ? "กำลังออก..." : "ออกจากระบบ"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

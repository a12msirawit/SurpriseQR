"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CreditCard, Gift, Menu, ShieldCheck, UserCircle2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import IncomeGuideModal from "@/components/dashboard/income-guide-modal";
import LogoutButton from "@/components/auth/logout-button";

interface NavbarProps {
  user: { id: string } | null;
  isAdmin: boolean;
  displayName: string;
}

const navLinks = [
  ["หน้าหลัก", "/dashboard"],
  ["เทมเพลต", "#template-section"],
  ["การ์ดของฉัน", "/dashboard"],
] as const;

export default function Navbar({ user, isAdmin, displayName }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const supabase = createClient();

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <nav className="glass-panel sticky top-0 z-50 border-b border-space-border">
      <div className="mx-auto flex w-full max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10 lg:py-5">
        <div className="text-slate-100">
          <p className="flex items-center gap-2 text-xl font-bold lg:text-2xl"><Gift className="h-5 w-5 text-space-accent" />SurpriseQR</p>
          <p className="text-sm font-semibold text-slate-200 lg:text-base">สร้างความประทับใจ</p>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {navLinks.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className={`rounded-xl px-3 py-1.5 text-base font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent ${href === "/dashboard" ? "bg-white/10 text-white" : "text-slate-100 hover:bg-white/10 hover:text-space-accent"}`}
            >
              {label}
            </Link>
          ))}
          <IncomeGuideModal />
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? <>
            <div className="glass-panel hidden items-center gap-2 rounded-xl border-space-border px-4 py-2 text-base font-bold sm:flex"><UserCircle2 className="h-4 w-4 text-slate-200" />{displayName}</div>
            <Link href="/dashboard/drafts" className="hidden rounded-xl px-3 py-1.5 text-base font-bold text-slate-200 transition-all duration-200 hover:bg-white/10 hover:text-space-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent sm:inline-flex">ร่างที่บันทึกไว้</Link>
            {isAdmin && (
              <Link href="/admin" className="hidden rounded-xl px-3 py-1.5 text-base font-bold text-slate-200 transition-all duration-200 hover:bg-white/10 hover:text-space-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent md:inline-flex">
                <ShieldCheck className="mr-2 h-4 w-4 text-slate-300" />
                ผู้ดูแล
              </Link>
            )}
            <LogoutButton />
          </> : <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="hidden items-center gap-2 rounded-xl border border-space-border bg-white/5 px-3 py-1.5 text-base font-bold text-slate-100 transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent disabled:opacity-50 md:inline-flex"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {googleLoading ? "กำลังเปลี่ยนทาง..." : "เข้าสู่ระบบด้วย Google"}
            </button>
            <Link href="/login" className="rounded-xl px-3 py-1.5 text-base font-bold text-slate-100 transition-all duration-200 hover:bg-white/10 hover:text-space-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent">เข้าสู่ระบบ</Link>
            <Link href="/register" className="btn-gradient rounded-xl px-3 py-1.5 text-base font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent">สมัครสมาชิก</Link>
          </div>}
        </div>

        <button type="button" aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนู"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="min-h-[44px] rounded-xl p-2 text-slate-100 hover:bg-white/10 md:hidden">
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden md:hidden">
            <div className="glass-panel flex flex-col gap-3 border-t border-space-border px-4 py-4 sm:px-6">
              {navLinks.map(([label, href]) => (
                <Link key={label} href={href} onClick={closeMenu} className="flex min-h-[44px] items-center rounded-xl px-3 text-base font-bold text-slate-100 hover:bg-white/10 hover:text-space-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent">{label}</Link>
              ))}
              <div className="flex min-h-[44px] items-center [&>button]:min-h-[44px]"><IncomeGuideModal /></div>
              {user ? <>
                <div className="flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-base font-bold text-slate-100"><UserCircle2 className="h-5 w-5 text-slate-200" />{displayName}</div>
                <Link href="/dashboard/drafts" onClick={closeMenu} className="flex min-h-[44px] items-center rounded-xl px-3 text-base font-bold text-slate-100 hover:bg-white/10 hover:text-space-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent">ร่างที่บันทึกไว้</Link>
                {isAdmin && <Link href="/admin" onClick={closeMenu} className="flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-base font-bold text-slate-100 hover:bg-white/10 hover:text-space-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent"><ShieldCheck className="h-5 w-5 text-slate-200" />ผู้ดูแล</Link>}
                <div className="min-h-[44px] [&>button]:min-h-[44px]"><LogoutButton /></div>
              </> : <>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border border-space-border bg-white/5 px-3 text-base font-bold text-slate-100 transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent disabled:opacity-50"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {googleLoading ? "กำลังเปลี่ยนทาง..." : "เข้าสู่ระบบด้วย Google"}
                </button>
                <Link href="/login" onClick={closeMenu} className="flex min-h-[44px] items-center rounded-xl px-3 text-base font-bold text-slate-100 hover:bg-white/10 hover:text-space-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent">เข้าสู่ระบบ</Link>
                <Link href="/register" onClick={closeMenu} className="btn-gradient flex min-h-[44px] items-center justify-center rounded-xl px-3 text-base font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent">สมัครสมาชิก</Link>
              </>}
              <Link href="/topup" onClick={closeMenu} className="btn-gradient flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 text-base font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-accent"><CreditCard className="h-4 w-4" />+ เติมเงิน<ArrowRight className="h-4 w-4" /></Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

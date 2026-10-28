"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Gift, Heart, QrCode, Sparkles, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const supabase = createClient();

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
    <main className="relative isolate min-h-screen overflow-hidden bg-transparent px-[1cm] py-6 text-slate-100">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-space-accent/10" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-space-glow/10" />
      <div className="pointer-events-none absolute right-[18%] top-[18%] h-24 w-24 rounded-full border-2 border-space-border bg-space-accent/10" />

      <nav className="relative mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-space-accent to-space-purple text-white shadow-lg shadow-space-accent/20 ring-1 ring-space-border">
            <QrCode className="h-6 w-6" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">SurpriseQR</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="hidden items-center gap-2 rounded-xl border border-space-border bg-white/5 px-5 py-3 text-base font-bold text-slate-200 transition hover:bg-white/20 hover:border-space-accent/50 hover:text-space-accent disabled:opacity-50 sm:inline-flex"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {googleLoading ? "กำลังเปลี่ยนทาง..." : "เข้าสู่ระบบด้วย Google"}
          </button>
          <Link href="/login" className="btn-gradient rounded-xl px-8 py-4 text-xl font-black text-white transition hover:-translate-y-0.5">
            เข้าสู่ระบบ
          </Link>
          <Link href="/register" className="hidden rounded-xl border border-space-border bg-white/5 px-8 py-4 text-xl font-black text-slate-200 transition hover:bg-white/20 hover:border-space-accent/50 hover:text-space-accent sm:inline-flex">
            สมัครสมาชิก
          </Link>
        </div>
      </nav>

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl grid-cols-1 items-center justify-center gap-8 py-14 lg:grid-cols-2 lg:gap-12 lg:py-20 px-[1cm]">
        <section className="flex flex-col justify-center">
          <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-space-border glass-panel bg-white/5 px-4 py-2 text-sm font-semibold text-space-accent shadow-sm">
            <Sparkles className="h-4 w-4" /> ของขวัญที่ส่งต่อความรู้สึก
          </div>
          <h1 className="max-w-xl text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl">
            ความทรงจำดี ๆ
            <span className="mt-2 block text-space-accent text-glow">เริ่มต้นที่นี่</span>
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-slate-300 sm:text-xl">
            สร้างและแชร์การ์ดของขวัญผ่าน QR Code อย่างมีความหมาย
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/dashboard" className="btn-gradient inline-flex w-fit items-center justify-center gap-2 rounded-xl px-8 py-5 text-xl font-black text-white transition hover:-translate-y-1">
              เริ่มเลย <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>

        <section className="relative mx-auto flex w-full max-w-md items-center justify-center" aria-label="ตัวอย่างการ์ดของขวัญ">
          <div className="absolute -right-5 -top-5 flex h-16 w-16 rotate-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-xl shadow-amber-500/20">
            <Star className="h-8 w-8 fill-current" />
          </div>
          <div className="rotate-2 rounded-[2rem] glass-panel border border-space-border bg-white/5 p-3 shadow-2xl shadow-black/40 transition-transform duration-500 hover:rotate-0">
            <div className="rounded-[1.5rem] bg-gradient-to-br from-[#1a0f2e] via-[#0f0820] to-[#06030c] border border-space-border p-7 sm:p-9">
              <div className="flex items-center justify-between text-space-accent"><Gift className="h-7 w-7" /><Heart className="h-5 w-5 fill-current" /></div>
              <p className="mt-14 text-sm font-semibold uppercase tracking-[0.25em] text-white/60">ของขวัญสำหรับ</p>
              <h2 className="mt-2 text-4xl font-black text-white">คนพิเศษของคุณ</h2>
              <div className="mt-10 flex items-end justify-between gap-4">
                <p className="max-w-[12rem] text-sm leading-6 text-white/70">ทุกความรู้สึกมีเรื่องราวให้เปิดอ่าน</p>
                <div className="rounded-xl bg-white p-2 shadow-lg"><QrCode className="h-20 w-20 text-space-purple" /></div>
              </div>
            </div>
          </div>
          <p className="mt-7 text-center text-sm font-medium text-slate-400">สแกนครั้งเดียว เปิดความประทับใจได้ทุกที่</p>
        </section>
      </div>
    </main>
  );
}

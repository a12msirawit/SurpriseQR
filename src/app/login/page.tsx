"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Gift, LogIn, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GoogleLoginButton from "@/components/auth/google-login-button";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        const userMessage = signInError.message.includes("Invalid login credentials")
          ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง"
          : signInError.message;
        setError(userMessage);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", signInData.user.id)
        .single();

      router.push(profile?.role === "admin" ? "/admin" : "/dashboard");
      router.refresh();
    } catch (error) {
      console.error('Auth Exception (signIn):', error);
      setError('เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#06030c] p-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-space-border glass-panel bg-white/5 p-8 backdrop-blur-xl">
        <div className="flex justify-center">
          <Gift className="w-12 h-12 text-space-accent" />
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">ยินดีต้อนรับกลับ</h1>
          <p className="text-slate-400">เข้าสู่ระบบบัญชีของคุณ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              อีเมล
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-space-accent/30 transition-all"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              รหัสผ่าน
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-space-accent/30 transition-all"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-xl">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full px-6 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-space-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#06030c] text-slate-400">หรือ</span>
          </div>
        </div>

        <GoogleLoginButton />

        <p className="text-center text-slate-400">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="text-rose-600 hover:text-rose-700 font-semibold">
            สมัครสมาชิก
          </Link>
        </p>
      </div>
    </main>
  );
}

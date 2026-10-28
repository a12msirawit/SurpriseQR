"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.replace("/");
  }

  return (
    <button 
      type="button" 
      onClick={handleLogout}
      className="flex items-center gap-2 rounded-xl border border-space-border/50 bg-white/10 hover:bg-white/20 px-4 py-2.5 text-base font-semibold text-slate-200 transition-all"
    >
      <LogOut className="h-5 w-5" />
      ออกจากระบบ
    </button>
  );
}

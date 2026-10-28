import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import UserManager from "@/components/admin/user-manager";

export const dynamic = "force-dynamic";

interface AdminUserRow {
  id: string;
  email: string;
  role: "user" | "admin";
  tier: string;
  credits: number;
  is_banned: boolean;
  created_at: string;
}

export default async function AdminUsersPage() {
  await requireAdmin();

  const supabase = createAdminClient();

  const [{ data: authData, error: authError }, { data: profiles, error: profileError }] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase
      .from("profiles")
      .select("id, role, tier, credits, is_banned, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (authError) {
    console.error("Failed to fetch auth users:", authError.message || authError);
  }
  if (profileError) {
    console.error("Failed to fetch profiles:", profileError.message || profileError);
  }

  const emails = new Map<string, string>();
  for (const authUser of authData?.users ?? []) {
    emails.set(authUser.id, authUser.email ?? "");
  }

  const profileMap = new Map<string, {
    id: string;
    role: "user" | "admin";
    tier: string;
    credits: number;
    is_banned: boolean | null;
    created_at: string;
  }>();

  for (const profile of (profiles ?? [])) {
    profileMap.set(profile.id, profile);
  }

  const rows: AdminUserRow[] = [];

  for (const [id, email] of emails) {
    const profile = profileMap.get(id);
    if (profile) {
      rows.push({
        id: profile.id,
        email,
        role: profile.role,
        tier: profile.tier,
        credits: Number(profile.credits ?? 0),
        is_banned: Boolean(profile.is_banned),
        created_at: profile.created_at,
      });
    } else {
      rows.push({
        id,
        email,
        role: "user",
        tier: "free",
        credits: 0,
        is_banned: false,
        created_at: new Date().toISOString(),
      });
    }
  }

  rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <main className="min-h-screen bg-[#06030c] p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 -ml-4 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-fuchsia-300">
          ← กลับแดชบอร์ดผู้ดูแล
        </Link>
        <header className="mt-4 glass-panel rounded-2xl p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent md:text-3xl">
            จัดการผู้ใช้
          </h1>
          <p className="mt-1 text-sm text-slate-400">ค้นหา ระงับ/ปลดระงับ และปรับยอดเครดิตผู้ใช้</p>
        </header>
        <section className="mt-6 glass-panel rounded-2xl p-6">
          <UserManager users={rows} />
        </section>
      </div>
    </main>
  );
}
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ credits: 0, tier: "free", permanent_card_quota: 0, premium_template_quota: 0, isGuest: true }, { status: 200 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits, tier, permanent_quota, premium_quota")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ credits: profile.credits, balance: profile.credits, tier: profile.tier, permanent_card_quota: profile.permanent_quota, premium_template_quota: profile.premium_quota, isGuest: false });
  } catch {
    return NextResponse.json({ credits: 0, tier: "free", permanent_card_quota: 0, premium_template_quota: 0, isGuest: true }, { status: 200 });
  }
}

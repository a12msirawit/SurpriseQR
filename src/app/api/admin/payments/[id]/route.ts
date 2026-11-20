import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function extractSlipStoragePath(slipUrl: string): string | null {
  if (!slipUrl) return null;
  const marker = "/slips/";
  const idx = slipUrl.indexOf(marker);
  if (idx === -1) return null;
  const rawPath = slipUrl.slice(idx + marker.length).split("?")[0];
  return rawPath ? decodeURIComponent(rawPath) : null;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "slip_only" ? "slip_only" : "record";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db =
    supabaseUrl && serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : await createClient();

  const { data: payment, error: fetchError } = await db
    .from("payments")
    .select("id, slip_url")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !payment) {
    return NextResponse.json({ error: "ไม่พบรายการชำระเงิน" }, { status: 404 });
  }

  const storagePath = extractSlipStoragePath(payment.slip_url || "");
  if (storagePath) {
    await db.storage.from("slips").remove([storagePath]);
  }

  if (mode === "slip_only") {
    const { error: updateError } = await db
      .from("payments")
      .update({ slip_url: "" })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    return NextResponse.json({ success: true, mode: "slip_only" });
  }

  const { error: deleteError } = await db.from("payments").delete().eq("id", id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, mode: "record" });
}


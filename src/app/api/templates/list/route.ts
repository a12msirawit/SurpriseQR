import { NextResponse } from "next/server";
import { getAllTemplates } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const templates = await getAllTemplates();
    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    console.error("Templates list API error:", error);
    return NextResponse.json(
      { error: "Failed to load templates" },
      { status: 500 },
    );
  }
}

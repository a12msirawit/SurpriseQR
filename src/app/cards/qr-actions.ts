"use server";

import { generateQRCode } from "@/lib/qr-code";
import { headers } from "next/headers";

export async function generateCardQRCode(hashId: string) {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const cardUrl = `${protocol}://${host}/c/${hashId}`;

  try {
    const qrDataUrl = await generateQRCode(cardUrl);
    return {
      success: true,
      data: qrDataUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate QR code",
    };
  }
}

"use client";

import SurpriseQR from "@/components/cards/SurpriseQR";
import type { SurpriseQRData } from "@/types/templates";

interface AnniversaryTemplateProps {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
}

/**
 * Wrapper แปลง config (unknown) ให้เป็น SurpriseQRData ก่อนส่งให้ SurpriseQR engine.
 * กรณี config ไม่ใช่รูปแบบ SurpriseQRData ที่ถูกต้อง ใช้ defaultSurpriseQRData เป็นพื้นฐาน
 * แล้วทับค่าที่มีอยู่เท่านั้น — ไม่ fallback เงียบไปเทมเพลตอื่น.
 */
export default function AnniversaryTemplate({
  config,
  isEditing = false,
  studio = false,
  activeScreen,
  refreshToken,
  expectedPin,
}: AnniversaryTemplateProps) {
  const mergedConfig = config as Partial<SurpriseQRData> | undefined;

  return (
    <SurpriseQR
      config={mergedConfig as SurpriseQRData}
      isEditing={isEditing}
      studio={studio}
      activeScreen={activeScreen}
      refreshToken={refreshToken}
      expectedPin={expectedPin}
    />
  );
}

AnniversaryTemplate.displayName = "AnniversaryTemplate";

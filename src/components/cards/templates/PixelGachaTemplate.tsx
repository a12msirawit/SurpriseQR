"use client";

import PixelGachaTemplateInner from "@/components/templates/PixelGacha/PixelGachaTemplate";
import type { SurpriseQRData } from "@/types/templates";

interface PixelGachaTemplateProps {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

export default function PixelGachaTemplate({
  config,
  isEditing = false,
  studio = false,
  activeScreen,
  refreshToken,
  expectedPin,
  hashId,
  onSelectField,
}: PixelGachaTemplateProps) {
  return (
    <PixelGachaTemplateInner
      config={config as Partial<SurpriseQRData>}
      isEditing={isEditing}
      studio={studio}
      activeScreen={activeScreen}
      refreshToken={refreshToken}
      expectedPin={expectedPin}
      hashId={hashId}
      onSelectField={onSelectField}
    />
  );
}

PixelGachaTemplate.displayName = "PixelGachaTemplate";


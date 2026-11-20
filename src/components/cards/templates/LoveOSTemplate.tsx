"use client";

import LoveOSTemplateInner from "@/components/templates/LoveOS/LoveOSTemplate";
import type { SurpriseQRData } from "@/types/templates";

interface LoveOSTemplateProps {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

export default function LoveOSTemplate({
  config,
  isEditing = false,
  studio = false,
  activeScreen,
  refreshToken,
  expectedPin,
  hashId,
  onSelectField,
}: LoveOSTemplateProps) {
  return (
    <LoveOSTemplateInner
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

LoveOSTemplate.displayName = "LoveOSTemplate";


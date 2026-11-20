"use client";

import Lunar3DTemplateInner from "@/components/templates/Lunar3D/Lunar3DTemplate";
import type { SurpriseQRData } from "@/types/templates";

interface Lunar3DTemplateProps {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

export default function Lunar3DTemplate({
  config,
  isEditing = false,
  studio = false,
  activeScreen,
  refreshToken,
  expectedPin,
  hashId,
  onSelectField,
}: Lunar3DTemplateProps) {
  return (
    <Lunar3DTemplateInner
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

Lunar3DTemplate.displayName = "Lunar3DTemplate";


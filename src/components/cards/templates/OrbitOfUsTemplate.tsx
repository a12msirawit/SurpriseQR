"use client";

import OrbitOfUsTemplateInner from "@/components/templates/OrbitOfUs/OrbitOfUsTemplate";
import type { SurpriseQRData } from "@/types/templates";

interface OrbitOfUsTemplateProps {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

export default function OrbitOfUsTemplate({
  config,
  isEditing = false,
  studio = false,
  activeScreen,
  refreshToken,
  expectedPin,
  hashId,
  onSelectField,
}: OrbitOfUsTemplateProps) {
  return (
    <OrbitOfUsTemplateInner
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

OrbitOfUsTemplate.displayName = "OrbitOfUsTemplate";


"use client";

import React from "react";
import StarlightMemoriesTemplateInner from "@/components/templates/StarlightMemories/StarlightMemoriesTemplate";
import type { SurpriseQRData } from "@/types/templates";

interface StarlightMemoriesTemplateProps {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

export default function StarlightMemoriesTemplate(props: StarlightMemoriesTemplateProps) {
  return <StarlightMemoriesTemplateInner {...props} config={props.config as SurpriseQRData} />;
}


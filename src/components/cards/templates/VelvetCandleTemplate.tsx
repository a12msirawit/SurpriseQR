"use client";

import React from "react";
import VelvetCandleTemplateInner from "@/components/templates/VelvetCandle/VelvetCandleTemplate";
import type { SurpriseQRData } from "@/types/templates";

interface VelvetCandleTemplateProps {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

export default function VelvetCandleTemplate(props: VelvetCandleTemplateProps) {
  return <VelvetCandleTemplateInner {...props} config={props.config as SurpriseQRData} />;
}


"use client";

import React from "react";
import MidnightCinemaTemplateInner from "@/components/templates/MidnightCinema/MidnightCinemaTemplate";
import type { SurpriseQRData } from "@/types/templates";

interface MidnightCinemaTemplateProps {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

export default function MidnightCinemaTemplate(props: MidnightCinemaTemplateProps) {
  return <MidnightCinemaTemplateInner {...props} config={props.config as SurpriseQRData} />;
}


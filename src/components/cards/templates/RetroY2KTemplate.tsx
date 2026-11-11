"use client";

import React from "react";
import RetroY2KTemplateInner from "@/components/templates/RetroY2K/RetroY2KTemplate";

interface RetroY2KTemplateProps {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

export default function RetroY2KTemplate(props: RetroY2KTemplateProps) {
  return <RetroY2KTemplateInner {...props} />;
}


"use client";

import React from "react";
import VintageWaxSealTemplateInner from "@/components/templates/VintageWaxSeal/VintageWaxSealTemplate";

interface VintageWaxSealTemplateProps {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

export default function VintageWaxSealTemplate(props: VintageWaxSealTemplateProps) {
  return <VintageWaxSealTemplateInner {...props} />;
}


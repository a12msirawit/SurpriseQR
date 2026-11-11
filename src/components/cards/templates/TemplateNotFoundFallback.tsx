"use client";
import { AlertTriangle } from "lucide-react";

type TemplateNotFoundFallbackProps = {
  message?: string;
  config?: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
};

export default function TemplateNotFoundFallback({
  message,
  config,
  isEditing,
  studio,
  activeScreen,
  refreshToken,
  expectedPin,
}: TemplateNotFoundFallbackProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-slate-400 bg-white/5 rounded-2xl border border-white/10">
      <AlertTriangle className="mb-3 h-8 w-8 text-amber-400" />
      <p className="text-sm font-medium">{message ?? "ไม่พบคอมโพเนนต์เทมเพลตที่เลือก กรุณาติดต่อผู้ดูแลระบบ"}</p>
    </div>
  );
}

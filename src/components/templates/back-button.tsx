"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ fallback = "/dashboard" }: { fallback?: string }) {
  const router = useRouter();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  };
  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="ย้อนกลับ"
      className="inline-flex items-center gap-2 text-base font-bold text-slate-300 hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" />ย้อนกลับ
    </button>
  );
}
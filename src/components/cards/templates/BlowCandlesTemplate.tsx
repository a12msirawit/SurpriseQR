"use client";

import React from "react";

interface BlowCandlesTemplateProps {
  config?: unknown;
  data?: {
    recipientName?: string;
    wishMessage?: string;
  };
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
}

export default function BlowCandlesTemplate({
  config,
  data,
}: BlowCandlesTemplateProps) {
  const configData = (config as { recipientName?: string; wishMessage?: string; data?: { recipientName?: string; wishMessage?: string } }) || {};
  const recipientName = configData?.recipientName || configData?.data?.recipientName || data?.recipientName || "";
  const wishMessage = configData?.wishMessage || configData?.data?.wishMessage || data?.wishMessage || "เป่าเทียนเพื่อขอพร";

  return (
    <div className="w-full h-full min-h-[400px] bg-gradient-to-b from-indigo-950 via-purple-900 to-black text-white p-6 flex flex-col items-center justify-center rounded-xl shadow-2xl relative overflow-hidden">
      {/* Birthday Header */}
      <h2 className="text-2xl md:text-3xl font-bold text-pink-300 mb-2 animate-bounce">
        🎂 Happy Birthday!
      </h2>
      <p className="text-sm text-gray-300 mb-6 text-center">
        {recipientName ? `To: ${recipientName}` : "Make a wish & blow out the candles!"}
      </p>

      {/* Birthday Cake Graphic & Candles */}
      <div className="relative my-4 flex flex-col items-center">
        {/* Candle Flames */}
        <div className="flex gap-4 mb-1">
          <div className="w-3 h-6 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_12px_#facc15]" />
          <div className="w-3 h-6 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_12px_#facc15] delay-100" />
          <div className="w-3 h-6 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_12px_#facc15] delay-200" />
        </div>
        {/* Cake Body */}
        <div className="w-44 h-24 bg-pink-500 rounded-t-3xl border-b-4 border-pink-700 flex items-center justify-center shadow-lg relative">
          <span className="text-2xl">🎉</span>
        </div>
        <div className="w-52 h-10 bg-amber-800 rounded-b-xl shadow-md" />
      </div>

      {/* Blow Action Controls */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <button className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 font-semibold rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95">
          💨 เป่าเทียน (Blow Candles)
        </button>
        <span className="text-xs text-gray-400">รองรับการเป่าผ่านไมโครโฟน / แตะที่หน้าจอ</span>
      </div>
    </div>
  );
}

BlowCandlesTemplate.displayName = "BlowCandlesTemplate";

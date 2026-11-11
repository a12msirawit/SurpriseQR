"use client";

import React, { useState } from "react";
import { playRetroClick } from "./retroSound";

export interface RetroButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger";
  sound?: boolean;
}

export default function RetroButton({
  children,
  className = "",
  onClick,
  onMouseDown,
  onMouseUp,
  sound = true,
  variant = "default",
  disabled = false,
  ...props
}: RetroButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (sound) playRetroClick();
    onClick?.(e);
  };

  return (
    <button
      {...props}
      disabled={disabled}
      onClick={handleClick}
      onMouseDown={(e) => {
        if (!disabled) setIsPressed(true);
        onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        setIsPressed(false);
        onMouseUp?.(e);
      }}
      onMouseLeave={() => setIsPressed(false)}
      className={`
        relative select-none px-3.5 py-1.5 text-xs font-bold text-black
        font-mono tracking-wider transition-none outline-none
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${
          isPressed
            ? "translate-x-[1px] translate-y-[1px] border-t-2 border-l-2 border-t-[#000000] border-l-[#000000] border-b-2 border-r-2 border-b-[#ffffff] border-r-[#ffffff] bg-[#b4b4b4]"
            : "border-t-2 border-l-2 border-t-[#ffffff] border-l-[#ffffff] border-b-2 border-r-2 border-b-[#000000] border-r-[#000000] bg-[#c0c0c0]"
        }
        ${
          variant === "primary"
            ? "outline outline-1 outline-black -outline-offset-4 font-black"
            : ""
        }
        ${className}
      `}
    >
      <span className="flex items-center justify-center gap-1.5">
        {children}
      </span>
    </button>
  );
}


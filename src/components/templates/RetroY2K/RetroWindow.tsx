"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { playRetroClick } from "./retroSound";
import { Monitor, X } from "lucide-react";

export interface RetroWindowProps {
  title: string;
  icon?: string | React.ReactNode;
  children: React.ReactNode;
  width?: string | number;
  className?: string;
  onClose?: () => void;
  isClosable?: boolean;
  isActive?: boolean;
  onFocus?: () => void;
  statusText?: string;
  dragConstraints?: React.RefObject<Element | null>;
  onTitleClick?: (e: React.MouseEvent) => void;
  titleTooltip?: string;
}

const RetroWindow = React.memo(function RetroWindow({
  title,
  icon = <Monitor className="w-3.5 h-3.5 inline text-white" />,
  children,
  width = "auto",
  className = "",
  onClose,
  isClosable = true,
  isActive = true,
  onFocus,
  statusText,
  dragConstraints,
  onTitleClick,
  titleTooltip,
}: RetroWindowProps) {
  const [minimized, setMinimized] = useState(false);
  const [btnPressed, setBtnPressed] = useState<string | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

  return (
    <motion.div
      initial={hasMountedRef.current ? false : { scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.85, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 400 }}
      drag
      dragMomentum={false}
      dragConstraints={dragConstraints}
      onMouseDown={onFocus}
      style={{ width }}
      className={`
        relative select-none backface-hidden
        border-t-2 border-l-2 border-t-[#ffffff] border-l-[#ffffff]
        border-b-2 border-r-2 border-b-[#000000] border-r-[#000000]
        bg-[#c0c0c0] p-[3px] shadow-[3px_3px_10px_rgba(0,0,0,0.5)]
        font-mono text-black
        ${className}
      `}
    >
      {/* Title Bar */}
      <div
        className={`
          flex items-center justify-between px-2 py-1 select-none cursor-move
          ${
            isActive
              ? "bg-gradient-to-r from-[#000080] to-[#1084d0] text-white"
              : "bg-gradient-to-r from-[#808080] to-[#b0b0b0] text-[#d4d4d4]"
          }
        `}
      >
        <div
          onClick={onTitleClick}
          title={titleTooltip}
          className={`flex items-center gap-1.5 overflow-hidden text-xs md:text-sm font-bold tracking-tight ${
            onTitleClick ? "cursor-pointer hover:underline hover:text-cyan-200 transition-colors" : ""
          }`}
        >
          <span className="text-sm shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
        </div>

        {/* Window Controls: [ _ ] [ □ ] [ X ] */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Minimize button */}
          <button
            type="button"
            onMouseDown={() => {
              setBtnPressed("min");
              playRetroClick();
            }}
            onMouseUp={() => {
              setBtnPressed(null);
              setMinimized(!minimized);
            }}
            className={`
              w-4 h-4 flex items-center justify-center text-[9px] font-black text-black bg-[#c0c0c0]
              ${
                btnPressed === "min"
                  ? "translate-x-[1px] translate-y-[1px] border-t border-l border-t-[#000000] border-l-[#000000] border-b border-r border-b-[#ffffff] border-r-[#ffffff]"
                  : "border-t border-l border-t-[#ffffff] border-l-[#ffffff] border-b border-r border-b-[#000000] border-r-[#000000]"
              }
            `}
            aria-label="Minimize"
          >
            _
          </button>

          {/* Maximize button */}
          <button
            type="button"
            onMouseDown={() => {
              setBtnPressed("max");
              playRetroClick();
            }}
            onMouseUp={() => setBtnPressed(null)}
            className={`
              w-4 h-4 flex items-center justify-center text-[9px] font-black text-black bg-[#c0c0c0]
              ${
                btnPressed === "max"
                  ? "translate-x-[1px] translate-y-[1px] border-t border-l border-t-[#000000] border-l-[#000000] border-b border-r border-b-[#ffffff] border-r-[#ffffff]"
                  : "border-t border-l border-t-[#ffffff] border-l-[#ffffff] border-b border-r border-b-[#000000] border-r-[#000000]"
              }
            `}
            aria-label="Maximize"
          >
            □
          </button>

          {/* Close button */}
          {isClosable && (
            <button
              type="button"
              onMouseDown={() => {
                setBtnPressed("close");
                playRetroClick();
              }}
              onMouseUp={() => {
                setBtnPressed(null);
                onClose?.();
              }}
              className={`
                w-4 h-4 flex items-center justify-center text-[10px] font-black text-black bg-[#c0c0c0]
                ${
                  btnPressed === "close"
                    ? "translate-x-[1px] translate-y-[1px] border-t border-l border-t-[#000000] border-l-[#000000] border-b border-r border-b-[#ffffff] border-r-[#ffffff]"
                    : "border-t border-l border-t-[#ffffff] border-l-[#ffffff] border-b border-r border-b-[#000000] border-r-[#000000]"
                }
              `}
              aria-label="Close"
            >
              <X className="w-2.5 h-2.5 mx-auto" />
            </button>
          )}
        </div>
      </div>

      {/* Window Body (collapsible when minimized) */}
      {!minimized && (
        <div className="mt-1">
          {children}

          {/* Optional 90s Status Bar */}
          {statusText && (
            <div className="mt-2 border-t-2 border-l-2 border-t-[#808080] border-l-[#808080] border-b-2 border-r-2 border-b-[#ffffff] border-r-[#ffffff] bg-[#c0c0c0] px-2 py-0.5 text-[11px] text-[#404040]">
              {statusText}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
});

export default RetroWindow;


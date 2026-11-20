"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { playFuseSizzle, unlockNewYearAudio } from "./newYearSound";

interface FireworksFuseRackProps {
  muted: boolean;
  onLaunchRocket: (rocketIdx: number, fallbackXPct: number, clientX?: number) => void;
  onAllFinished: () => void;
}

const ROCKET_COUNT = 5;
// Horizontal SVG coordinates across a 400px viewBox for the 5 firework tubes
const ROCKET_XS = [44, 122, 200, 278, 356];
const ROCKET_X_PCTS = [0.14, 0.32, 0.5, 0.68, 0.86];
const TUBE_COLORS = [
  { body: "#be123c", stripe: "#fde68a", tip: "#fb7185" },
  { body: "#4338ca", stripe: "#fde68a", tip: "#818cf8" },
  { body: "#b45309", stripe: "#fef3c7", tip: "#fbbf24" },
  { body: "#0f766e", stripe: "#fde68a", tip: "#5eead4" },
  { body: "#7e22ce", stripe: "#fde68a", tip: "#d8b4fe" },
];

type SegmentBurnDir = null | "ltr" | "rtl";

/**
 * Interactive row of 5 festive fireworks at the bottom of the sky connected
 * by a continuous curving rope fuse. Tapping ANY firework ignites it immediately
 * and sends glowing burning sparks racing left & right along the fuse to ignite
 * every connected firework in sequence!
 */
export default function FireworksFuseRack({
  muted,
  onLaunchRocket,
  onAllFinished,
}: FireworksFuseRackProps) {
  const [ignited, setIgnited] = useState(false);
  const [firedMask, setFiredMask] = useState<boolean[]>(() =>
    Array(ROCKET_COUNT).fill(false),
  );
  const [segmentBurn, setSegmentBurn] = useState<SegmentBurnDir[]>([
    null,
    null,
    null,
    null,
  ]);
  const [segmentDone, setSegmentDone] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const onLaunchRef = useRef(onLaunchRocket);
  const onFinishedRef = useRef(onAllFinished);
  const mutedRef = useRef(muted);

  useEffect(() => {
    onLaunchRef.current = onLaunchRocket;
  }, [onLaunchRocket]);

  useEffect(() => {
    onFinishedRef.current = onAllFinished;
  }, [onAllFinished]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const igniteFrom = useCallback(
    (startIdx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (ignited) return;
      unlockNewYearAudio();
      setIgnited(true);

      const STEP_MS = 720; // Suspenseful burning-fuse travel time per segment

      const fireRocket = (idx: number) => {
        setFiredMask((prev) => {
          const next = [...prev];
          next[idx] = true;
          return next;
        });
        const svgEl = svgRef.current;
        const clientX = svgEl
          ? svgEl.getBoundingClientRect().left +
            (ROCKET_XS[idx] / 400) * svgEl.getBoundingClientRect().width
          : undefined;
        onLaunchRef.current(idx, ROCKET_X_PCTS[idx], clientX);
      };

      const startSegment = (segIdx: number, dir: "ltr" | "rtl") => {
        if (!mutedRef.current) playFuseSizzle(0.66);
        setSegmentBurn((prev) => {
          const next = [...prev];
          next[segIdx] = dir;
          return next;
        });
        const doneT = setTimeout(() => {
          setSegmentDone((prev) => {
            const next = [...prev];
            next[segIdx] = true;
            return next;
          });
        }, STEP_MS - 30);
        timersRef.current.push(doneT);
      };

      // Step 0: Ignite the tapped firework immediately
      fireRocket(startIdx);

      const maxDist = Math.max(startIdx, ROCKET_COUNT - 1 - startIdx);

      for (let d = 1; d <= maxDist; d++) {
        const segStartAt = (d - 1) * STEP_MS + 110;
        const arriveAt = d * STEP_MS + 110;

        const leftRocket = startIdx - d;
        const rightRocket = startIdx + d;

        if (leftRocket >= 0) {
          const segIdx = leftRocket; // connects leftRocket <-> leftRocket+1
          timersRef.current.push(
            setTimeout(() => startSegment(segIdx, "rtl"), segStartAt),
          );
          timersRef.current.push(
            setTimeout(() => fireRocket(leftRocket), arriveAt),
          );
        }

        if (rightRocket < ROCKET_COUNT) {
          const segIdx = rightRocket - 1; // connects rightRocket-1 <-> rightRocket
          timersRef.current.push(
            setTimeout(() => startSegment(segIdx, "ltr"), segStartAt),
          );
          timersRef.current.push(
            setTimeout(() => fireRocket(rightRocket), arriveAt),
          );
        }
      }

      // After the last firework rockets up and bursts across the night sky -> reveal mystery floating photo!
      const totalCompleteMs = maxDist * STEP_MS + 1850;
      timersRef.current.push(
        setTimeout(() => {
          onFinishedRef.current();
        }, totalCompleteMs),
      );
    },
    [ignited],
  );

  return (
    <div className="pointer-events-auto relative flex w-full max-w-[440px] flex-col items-center px-2">
      {/* Clean whisper prompt */}
      <motion.div
        animate={{ opacity: ignited ? 0 : [0.7, 1, 0.7] }}
        transition={
          ignited
            ? { duration: 0.35 }
            : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
        }
        className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-slate-950/55 px-3.5 py-1 text-xs font-medium text-amber-200 backdrop-blur-md"
      >
        <Flame className="h-3.5 w-3.5 text-amber-400" />
        <span>แตะจุดพลุลูกไหนก็ได้ ฉนวนจะแล่นจุดต่อกันทั้งหมด</span>
      </motion.div>

      {/* SVG Connected Fuse & 5 Festive Firework Tubes */}
      <div className="relative w-full">
        <svg
          ref={svgRef}
          viewBox="0 0 400 132"
          className="h-auto w-full overflow-visible drop-shadow-[0_10px_22px_rgba(0,0,0,0.65)]"
        >
          <defs>
            <radialGradient id="sparkFlare" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="40%" stopColor="#FDE047" />
              <stop offset="75%" stopColor="#F97316" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 4 Connecting Rope Fuse Segments Between Adjacent Fireworks */}
          {[0, 1, 2, 3].map((segIdx) => {
            const x1 = ROCKET_XS[segIdx];
            const x2 = ROCKET_XS[segIdx + 1];
            const midX = (x1 + x2) / 2;
            const yBase = 104;
            const yDip = 124;
            const dir = segmentBurn[segIdx];
            const done = segmentDone[segIdx];
            const dLtr = `M ${x1} ${yBase} Q ${midX} ${yDip} ${x2} ${yBase}`;
            const dRtl = `M ${x2} ${yBase} Q ${midX} ${yDip} ${x1} ${yBase}`;

            return (
              <g key={`fuse-seg-${segIdx}`}>
                {/* Base unlit braided cord */}
                <path
                  d={dLtr}
                  fill="none"
                  stroke={done ? "#334155" : "#d6b47c"}
                  strokeWidth={done ? 2 : 3}
                  strokeDasharray={done ? "2 4" : "5 3"}
                  strokeLinecap="round"
                  opacity={done ? 0.45 : 0.9}
                />

                {/* Animated burning molten fuse trail */}
                {dir && (
                  <motion.path
                    d={dir === "ltr" ? dLtr : dRtl}
                    fill="none"
                    stroke="#fb923c"
                    strokeWidth={3.6}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 1 }}
                    animate={{
                      pathLength: 1,
                      opacity: done ? 0 : 1,
                    }}
                    transition={{
                      pathLength: { duration: 0.68, ease: "linear" },
                      opacity: { duration: 0.25 },
                    }}
                  />
                )}

                {/* Traveling sizzling golden spark ball racing along the sagging fuse */}
                {dir && !done && (
                  <motion.g
                    initial={{
                      x: dir === "ltr" ? x1 : x2,
                      y: yBase,
                      scale: 0.8,
                    }}
                    animate={{
                      x: dir === "ltr" ? [x1, midX, x2] : [x2, midX, x1],
                      y: [yBase, yDip - 9, yBase],
                      scale: [1, 1.35, 1.05],
                    }}
                    transition={{ duration: 0.68, ease: "linear" }}
                  >
                    <circle r={13} fill="url(#sparkFlare)" />
                    <circle r={3.5} fill="#FFFBEB" />
                  </motion.g>
                )}
              </g>
            );
          })}

          {/* 5 Interactive Firework Mortar Tubes + Rockets */}
          {ROCKET_XS.map((cx, idx) => {
            const palette = TUBE_COLORS[idx];
            const fired = firedMask[idx];

            return (
              <g
                key={`rocket-${idx}`}
                onClick={(e) => igniteFrom(idx, e)}
                className={ignited ? "cursor-default" : "cursor-pointer"}
              >
                {/* Generous invisible hit area for easy mobile tapping */}
                <rect
                  x={cx - 30}
                  y={16}
                  width={60}
                  height={108}
                  fill="transparent"
                />

                {/* Wooden Launch Stand / Base Collar */}
                <rect
                  x={cx - 17}
                  y={98}
                  width={34}
                  height={14}
                  rx={4}
                  fill="#1e1b38"
                  stroke="#f59e0b"
                  strokeOpacity={0.55}
                  strokeWidth={1.2}
                />

                {/* Fuse Connector Knot at Base */}
                <circle
                  cx={cx}
                  cy={104}
                  r={4.2}
                  fill={fired ? "#475569" : "#fbbf24"}
                  stroke="#0f172a"
                  strokeWidth={1.2}
                />

                {/* Firework Rocket Launching Upward When Fired! */}
                <motion.g
                  initial={{ y: 0, opacity: 1 }}
                  animate={
                    fired
                      ? { y: -260, opacity: [1, 1, 0], scale: [1, 1.05, 0.6] }
                      : { y: [0, -2, 0], opacity: 1 }
                  }
                  transition={
                    fired
                      ? { duration: 0.55, ease: [0.4, 0, 1, 1] }
                      : {
                          duration: 2.2,
                          repeat: Infinity,
                          delay: idx * 0.18,
                          ease: "easeInOut",
                        }
                  }
                >
                  {/* Stick tail */}
                  <rect
                    x={cx - 1.5}
                    y={82}
                    width={3}
                    height={22}
                    rx={1}
                    fill="#d6b47c"
                  />
                  {/* Rocket Body */}
                  <rect
                    x={cx - 12}
                    y={46}
                    width={24}
                    height={40}
                    rx={4}
                    fill={palette.body}
                    stroke="#fde68a"
                    strokeWidth={1.4}
                  />
                  {/* Diagonal Festive Gold Stripes */}
                  <path
                    d={`M ${cx - 11} 58 L ${cx + 11} 50 L ${cx + 11} 57 L ${cx - 11} 65 Z`}
                    fill={palette.stripe}
                    opacity={0.85}
                  />
                  <path
                    d={`M ${cx - 11} 72 L ${cx + 11} 64 L ${cx + 11} 71 L ${cx - 11} 79 Z`}
                    fill={palette.stripe}
                    opacity={0.85}
                  />
                  {/* Pointed Rocket Cone Cap */}
                  <polygon
                    points={`${cx},26 ${cx - 15},48 ${cx + 15},48`}
                    fill={palette.tip}
                    stroke="#fef3c7"
                    strokeWidth={1.2}
                    strokeLinejoin="round"
                  />
                  {/* Subtle glowing hover/idle beacon at rocket tip before ignition */}
                  {!ignited && (
                    <motion.circle
                      cx={cx}
                      cy={24}
                      r={4}
                      fill="#fde047"
                      animate={{ opacity: [0.35, 0.95, 0.35], scale: [0.8, 1.25, 0.8] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: idx * 0.22,
                      }}
                    />
                  )}
                </motion.g>

                {/* Launch Ignition Flash & Smoke Puff at Mortar Base */}
                {fired && (
                  <motion.g
                    initial={{ opacity: 0.95, scale: 0.4 }}
                    animate={{ opacity: 0, scale: 1.9, y: -22 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  >
                    <circle cx={cx} cy={92} r={16} fill="url(#sparkFlare)" />
                  </motion.g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

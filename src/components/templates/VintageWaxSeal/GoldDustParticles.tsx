"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

export default function GoldDustParticles() {
  const particles = useMemo(() => {
    return Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      x: (i * 37) % 100, // percentage
      y: (i * 23) % 100, // percentage
      size: 2 + (i % 3) * 1.5,
      duration: 6 + (i % 5) * 2,
      delay: (i % 7) * 0.8,
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background:
              "radial-gradient(circle, rgba(255,235,170,0.9) 0%, rgba(212,175,55,0.6) 60%, rgba(212,175,55,0) 100%)",
            boxShadow: "0 0 6px 1px rgba(255,215,0,0.6)",
          }}
          animate={{
            y: ["0px", "-45px", "0px"],
            x: ["0px", `${(p.id % 2 === 0 ? 1 : -1) * 18}px`, "0px"],
            opacity: [0.2, 0.85, 0.2],
            scale: [0.8, 1.25, 0.8],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}


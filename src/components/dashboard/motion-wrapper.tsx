"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

export function MotionDiv(props: HTMLMotionProps<"div">) {
  return <motion.div suppressHydrationWarning {...props} />;
}

export function MotionSection(props: HTMLMotionProps<"section">) {
  return <motion.section suppressHydrationWarning {...props} />;
}

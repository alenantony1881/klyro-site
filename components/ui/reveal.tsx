"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE, DUR, revealVariants, VIEWPORT_ONCE } from "@/lib/motion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "none";
  id?: string;
}

export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  id,
}: RevealProps) {
  return (
    <motion.div
      id={id}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      variants={revealVariants[direction]}
      transition={{ duration: DUR.slow, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

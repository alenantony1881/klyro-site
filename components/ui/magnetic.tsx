"use client";

import { motion, useReducedMotion, useSpring } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { SPRING } from "@/lib/motion";

interface MagneticProps {
  children: ReactNode;
  /** How far the element may travel toward the cursor, in px. */
  strength?: number;
  className?: string;
}

/**
 * Pulls its child toward the cursor on hover. Separate wrapper so Button can
 * stay a server-safe component — compose, don't add "use client" to Button.
 */
export function Magnetic({
  children,
  strength = 10,
  className,
}: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const x = useSpring(0, SPRING.snappy);
  const y = useSpring(0, SPRING.snappy);

  if (reduced) {
    return <span className={className}>{children}</span>;
  }

  return (
    <motion.span
      ref={ref}
      style={{ x, y, display: "inline-block" }}
      className={className}
      onPointerMove={(e) => {
        // Coarse pointers (touch) fire this on tap — no hover state to express.
        if (e.pointerType !== "mouse") return;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        x.set((dx / (r.width / 2)) * strength);
        y.set((dy / (r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}

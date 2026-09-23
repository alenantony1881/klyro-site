import type { Transition, Variants } from "framer-motion";

// Tuple assertion is required — a bare array widens to number[] and framer's
// Easing type rejects it.
export const EASE = [0.21, 0.47, 0.32, 0.98] as [number, number, number, number];
export const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number];

export const DUR = {
  fast: 0.2,
  quick: 0.3,
  base: 0.45,
  slow: 0.6,
  hero: 0.8,
} as const;

export const STAGGER = {
  tight: 0.06,
  base: 0.1,
  loose: 0.15,
} as const;

export const SPRING = {
  soft: { type: "spring", stiffness: 120, damping: 30 },
  snappy: { type: "spring", stiffness: 300, damping: 24 },
  scrub: { stiffness: 120, damping: 30, restDelta: 0.001 },
} as const;

export const transitions = {
  quick: { duration: DUR.quick, ease: EASE } satisfies Transition,
  base: { duration: DUR.base, ease: EASE } satisfies Transition,
  slow: { duration: DUR.slow, ease: EASE } satisfies Transition,
};

export const revealVariants: Record<"up" | "none", Variants> = {
  up: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  },
  none: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
};

export const staggerContainer = (stagger: number = STAGGER.base): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger } },
});

export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: transitions.slow },
};

export const VIEWPORT_ONCE = { once: true, margin: "-80px" } as const;

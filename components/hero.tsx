"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/ui/magnetic";
import { WorkflowCanvas } from "@/components/workflow-canvas";
import { DUR, EASE, STAGGER, fadeUpItem } from "@/lib/motion";

const container: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER.base, delayChildren: 0.05 },
  },
};

const item = fadeUpItem;

const FLOATING_CARDS = [
  { label: "Invoice reconciled", sub: "Synced to QuickBooks" },
  { label: "Lead qualified", sub: "Routed to sales" },
];

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[92vh] items-center overflow-hidden pt-32 pb-20"
    >
      {/* Subtle structural grid — the animated core glow comes from LivingBackground */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:64px_64px] opacity-30 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      </div>

      <div className="container relative">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={container}
          className="mx-auto flex max-w-3xl flex-col items-center text-center"
        >
          <motion.span
            variants={item}
            className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-4 py-1.5 text-xs font-medium text-muted"
          >
            <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
            AI automation for growing teams
          </motion.span>

          <div className="relative isolate mt-6">
            {/* Backlight. The headline sits above this and reads as occluding
                it, with light spilling around the glyph edges. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[340px] w-[min(720px,92vw)] -translate-x-1/2 -translate-y-1/2 animate-backlight rounded-full bg-[radial-gradient(closest-side,rgba(238,236,246,0.20),rgba(238,236,246,0.07)_45%,transparent_78%)] blur-[2px] [mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)] [will-change:opacity,transform]"
            />

            <motion.h1
              variants={item}
              className="relative z-10 text-balance font-heading text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl md:text-7xl"
            >
              <span className="[text-shadow:0_0_26px_rgba(232,230,242,0.22)]">
                Run your business.
              </span>
              <br />
              {/* drop-shadow, NOT text-shadow: text-shadow paints over a
                  bg-clip-text gradient and smears the glyphs. */}
              <span className="bg-gradient-to-r from-accent-light to-accent bg-clip-text text-transparent [filter:drop-shadow(0_0_18px_rgba(168,155,255,0.30))]">
                Not your busywork.
              </span>
            </motion.h1>
          </div>

          <motion.p
            variants={item}
            className="mt-6 max-w-xl text-balance text-base leading-relaxed text-muted md:text-lg"
          >
            Klyro builds AI agents that work your repetitive jobs end to end —
            support tickets, lead follow-up, invoice reconciliation — inside the
            tools you already use. First agent live in under two weeks.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Magnetic>
              <Button href="#contact" size="lg">
                Book a free automation audit
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </Magnetic>
            <Button href="#pipeline" variant="secondary" size="lg">
              Watch one ticket run
            </Button>
          </motion.div>

          <motion.p variants={item} className="mt-6 text-xs text-muted-2">
            No commitment · 30-minute call · Custom automation roadmap
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR.hero, delay: 0.55, ease: EASE }}
          className="relative mx-auto mt-12 max-w-4xl"
        >
          <div className="relative overflow-hidden rounded-3xl border border-border-strong bg-gradient-to-b from-surface to-surface-2/60 px-5 py-6 shadow-glow">
            <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
              <span className="flex gap-1.5">
                <span className="size-2 rounded-full bg-border-strong" />
                <span className="size-2 rounded-full bg-border-strong" />
                <span className="size-2 rounded-full bg-accent/60" />
              </span>
              <p className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-2">
                support-triage · live
              </p>
              <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-2">
                <span className="size-1.5 animate-pulse rounded-full bg-lime" />
                running
              </span>
            </div>
            <WorkflowCanvas />
          </div>

          <div className="mt-4 flex flex-col items-center gap-2 text-[11px] text-muted-2 sm:flex-row sm:justify-center sm:gap-6">
            {FLOATING_CARDS.map((card) => (
              <span key={card.label} className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-accent" />
                <span className="whitespace-nowrap">
                  {card.label}
                  <span className="text-muted-2/60"> · {card.sub}</span>
                </span>
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { motion, type Variants } from "framer-motion";
import { Bot, Plug, TimerReset } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  EASE,
  SPRING,
  STAGGER,
  VIEWPORT_ONCE,
  staggerContainer,
} from "@/lib/motion";

const FEATURES = [
  {
    icon: Bot,
    title: "Custom AI agents",
    description:
      "Purpose-built agents trained on your workflows and data — not generic chatbots wearing your logo.",
  },
  {
    icon: Plug,
    title: "Seamless integrations",
    description:
      "We connect directly to the tools you already run: your CRM, helpdesk, inbox, and internal systems.",
  },
  {
    icon: TimerReset,
    title: "24/7 autonomous ops",
    description:
      "Your automations work around the clock, escalate when needed, and keep getting sharper over time.",
  },
];

const container = staggerContainer(STAGGER.loose);

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE },
  },
};

export function Features() {
  return (
    <section id="features" className="relative scroll-mt-28 py-24 md:py-32">
      <div className="container">
        <SectionHeading
          eyebrow="What we do"
          title="Automation built around how you already work"
          description="No rip-and-replace. Klyro layers AI agents on top of your existing stack and workflows."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          variants={container}
          className="mt-16 grid gap-5 md:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariant}
              whileHover={{ y: -4 }}
              transition={SPRING.snappy}
              className="group relative overflow-hidden rounded-3xl border border-border bg-surface p-8"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-accent/0 blur-2xl transition-colors duration-500 group-hover:bg-accent/20" />
              <div className="relative flex size-12 items-center justify-center rounded-2xl border border-border-strong bg-surface-2">
                <feature.icon className="size-5 text-accent" aria-hidden="true" />
              </div>
              <h3 className="relative mt-6 font-heading text-xl font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="relative mt-3 text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

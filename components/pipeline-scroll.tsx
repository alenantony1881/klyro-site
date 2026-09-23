"use client";

import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/ui/reveal";
import { SPRING, STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface Stage {
  id: string;
  chip: string;
  title: string;
  body: string;
  meta: string;
}

const STAGES: Stage[] = [
  {
    id: "triage",
    chip: "Received",
    title: "The ticket lands",
    body: "Pulled from your helpdesk the moment it arrives. Priority and queue are inferred from what the customer actually wrote — not from keyword rules that break the first time someone phrases it differently.",
    meta: "avg. 1.8s to pick up",
  },
  {
    id: "classify",
    chip: "Classified",
    title: "Intent gets understood",
    body: "The agent reads the whole thread, works out what's really being asked, and checks it against your own policy docs and past resolutions before deciding anything.",
    meta: "reads full history + policy",
  },
  {
    id: "act",
    chip: "Executed",
    title: "The work gets done",
    body: "Refund issued, CRM updated, shipping partner notified. Each step runs against your real systems, and each one is individually logged and reversible.",
    meta: "4 systems touched",
  },
  {
    id: "log",
    chip: "Logged",
    title: "You stay in control",
    body: "Every action lands in an audit trail you can read. Anything the agent isn't confident about stops and escalates to a human — with the full context already attached.",
    meta: "human approval on exceptions",
  },
];

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export function PipelineScroll() {
  const reduced = useReducedMotion();
  const isDesktop = useIsDesktop();

  // Must be separate components: useScroll resolves its target on first render,
  // so the ref'd section has to already exist when the scrubbed version mounts.
  return isDesktop && !reduced ? <PipelineScrubbed /> : <PipelineStatic />;
}

function PipelineStatic() {
  return (
    <section id="pipeline" className="relative scroll-mt-28 py-24 md:py-32">
      <div className="container max-w-3xl">
        <Header />
        <ol className="mt-14 space-y-4">
          {STAGES.map((s, i) => (
            <Reveal key={s.id} delay={i * STAGGER.base}>
              <li className="rounded-3xl border border-border bg-surface/70 p-6">
                <StageChip index={i} chip={s.chip} active />
                <h3 className="mt-4 font-heading text-xl font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                <p className="mt-3 text-xs text-accent">{s.meta}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function PipelineScrubbed() {
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, SPRING.scrub);
  // Maps to stage INDICES (0..n-1), not buckets — so the first stage is fully
  // resolved the moment the section pins, and the last is fully resolved at the
  // end. Each panel peaks exactly on its own integer.
  const stagePos = useTransform(smooth, [0.06, 0.94], [0, STAGES.length - 1], {
    clamp: true,
  });
  const railScale = useTransform(smooth, [0.06, 0.94], [0, 1], { clamp: true });

  const [stage, setStage] = useState(0);
  const stageRef = useRef(0);

  useMotionValueEvent(stagePos, "change", (v) => {
    const next = Math.min(STAGES.length - 1, Math.max(0, Math.round(v)));
    if (next !== stageRef.current) {
      stageRef.current = next;
      setStage(next);
    }
  });

  return (
    <section
      ref={ref}
      id="pipeline"
      className="relative scroll-mt-28"
      style={{ height: `${STAGES.length * 100}vh` }}
    >
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="container">
          <Header />

          <div className="relative mt-12 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-center">
            {/* stage list */}
            <ol className="space-y-1">
              {STAGES.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-current={stage === i}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-colors duration-300",
                      stage === i ? "bg-surface" : "bg-transparent",
                    )}
                    onClick={() => {
                      const el = ref.current;
                      if (!el) return;
                      const top =
                        el.offsetTop +
                        (el.offsetHeight - window.innerHeight) *
                          ((i + 0.5) / STAGES.length);
                      window.scrollTo({ top, behavior: "smooth" });
                    }}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-lg border font-heading text-xs transition-colors duration-300",
                        stage === i
                          ? "border-accent bg-accent/15 text-accent"
                          : stage > i
                            ? "border-lime/40 text-lime"
                            : "border-border-strong text-muted-2",
                      )}
                    >
                      {stage > i ? "✓" : String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "font-heading text-base transition-colors duration-300 md:text-lg",
                        stage === i ? "text-foreground" : "text-muted-2",
                      )}
                    >
                      {s.title}
                    </span>
                  </button>
                </li>
              ))}

              {/* progress rail */}
              <li aria-hidden="true" className="!mt-6 px-4">
                <div className="h-px w-full overflow-hidden bg-border-strong">
                  <motion.div
                    className="h-full origin-left bg-gradient-to-r from-accent to-lime"
                    style={{ scaleX: railScale }}
                  />
                </div>
              </li>
            </ol>

            {/* detail panel — crossfaded, stacked so height never jumps */}
            <div className="relative min-h-[300px]">
              {STAGES.map((s, i) => (
                <StagePanel key={s.id} stage={s} index={i} stagePos={stagePos} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Header() {
  return (
    <div className="max-w-2xl">
      <span className="inline-flex rounded-full border border-border-strong bg-surface px-3 py-1 font-heading text-xs uppercase tracking-wider text-accent">
        How it runs
      </span>
      <h2 className="mt-5 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
        One ticket, start to finish
      </h2>
      <p className="mt-4 text-base leading-relaxed text-muted">
        Scroll to follow a single support ticket through the agent — the same path
        every one of your tickets would take.
      </p>
    </div>
  );
}

function StageChip({
  index,
  chip,
  active,
}: {
  index: number;
  chip: string;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-heading text-[11px] uppercase tracking-[0.14em]",
        active
          ? "border-lime/40 bg-lime/10 text-lime"
          : "border-border-strong text-muted-2",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {String(index + 1).padStart(2, "0")} · {chip}
    </span>
  );
}

function StagePanel({
  stage,
  index,
  stagePos,
}: {
  stage: Stage;
  index: number;
  stagePos: MotionValue<number>;
}) {
  // Peaks on its own index; adjacent panels cross at 0.5 with no dead zone.
  const opacity = useTransform(stagePos, [index - 1, index, index + 1], [0, 1, 0]);
  const y = useTransform(stagePos, [index - 1, index, index + 1], [24, 0, -24]);

  return (
    <motion.article
      style={{ opacity, y }}
      className="absolute inset-0 rounded-3xl border border-border bg-surface/80 p-7 backdrop-blur-sm"
      aria-hidden={false}
    >
      <StageChip index={index} chip={stage.chip} active />
      <h3 className="mt-5 font-heading text-2xl font-semibold text-foreground">
        {stage.title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted md:text-base">
        {stage.body}
      </p>
      <p className="mt-5 flex items-center gap-2 text-xs text-accent">
        <span className="size-1.5 rounded-full bg-accent" />
        {stage.meta}
      </p>
    </motion.article>
  );
}

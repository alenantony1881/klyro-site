import { CountUp } from "@/components/ui/count-up";
import { Marquee } from "@/components/ui/marquee";
import { Reveal } from "@/components/ui/reveal";

// Representative tools Klyro connects to, not client logos.
const INTEGRATIONS = [
  "Slack",
  "HubSpot",
  "Zendesk",
  "Gmail",
  "Notion",
  "Stripe",
  "Airtable",
  "QuickBooks",
];

// Capability figures for the reference build below, not delivered-client results.
const STATS = [
  { value: 6, suffix: "", label: "Steps in the reference workflow" },
  { value: 4, suffix: "", label: "Systems touched per ticket" },
  { value: 1.8, suffix: "s", decimals: 1, label: "Median pick-up time" },
  { value: 2, prefix: "< ", suffix: " wks", label: "Target time to first agent live" },
];

export function SocialProof() {
  return (
    <section id="proof" className="scroll-mt-28 border-y border-border py-20">
      <div className="container">
        <Reveal className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-2">
            Built to plug into the tools you already run
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-8">
          <Marquee>
            {INTEGRATIONS.map((name) => (
              <span
                key={name}
                className="shrink-0 font-heading text-xl font-medium text-muted-2 transition-colors hover:text-foreground"
              >
                {name}
              </span>
            ))}
          </Marquee>
        </Reveal>

        <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.08} className="text-center">
              <p className="font-heading text-3xl font-semibold text-foreground md:text-4xl">
                <CountUp
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  decimals={stat.decimals}
                />
              </p>
              <p className="mt-2 text-xs text-muted md:text-sm">{stat.label}</p>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-10 text-center">
          <p className="mx-auto max-w-xl text-xs leading-relaxed text-muted-2">
            Figures describe the reference support-triage build shown above — a
            demonstration of the architecture, not results from a delivered client
            engagement.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

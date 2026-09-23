import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { GithubIcon, LinkedinIcon, XIcon } from "@/components/ui/social-icons";

const FOOTER_LINKS = {
  Company: [
    { label: "Services", href: "#features" },
    { label: "Work", href: "#proof" },
    { label: "Ask AI", href: "#assistant" },
  ],
  Resources: [
    { label: "FAQ", href: "#faq" },
    { label: "Book a call", href: "#contact" },
  ],
};

const SOCIALS = [
  { label: "X (Twitter)", href: "https://twitter.com", icon: XIcon },
  { label: "LinkedIn", href: "https://linkedin.com", icon: LinkedinIcon },
  { label: "GitHub", href: "https://github.com", icon: GithubIcon },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border pt-20">
      <div className="container">
        <Reveal
          id="contact"
          className="relative overflow-hidden rounded-3xl border border-border-strong bg-surface px-8 py-14 text-center sm:px-16"
        >
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/25 blur-[100px]" />
          <h2 className="relative font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Ready to put your busywork on autopilot?
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-balance text-muted">
            Book a free 30-minute automation audit. We&apos;ll map out exactly
            where AI agents can save your team the most time.
          </p>
          <div className="relative mt-8 flex justify-center">
            <Button
              href="mailto:hello@klyro.ai"
              size="lg"
            >
              Book a free automation audit
            </Button>
          </div>
        </Reveal>

        <div className="mt-16 grid grid-cols-2 gap-10 pb-12 sm:grid-cols-4">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Klyro designs and deploys custom AI agents that run your
              business operations around the clock.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={social.label}
                  className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-border-strong text-muted transition-colors duration-200 hover:border-accent hover:text-accent"
                >
                  <social.icon className="size-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <p className="text-sm font-medium text-foreground">{heading}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors duration-200 hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border py-8 sm:flex-row">
          <p className="text-xs text-muted-2">
            © {new Date().getFullYear()} Klyro. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="#"
              className="text-xs text-muted-2 transition-colors hover:text-muted"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-xs text-muted-2 transition-colors hover:text-muted"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useState } from "react";
import { AccordionItem } from "@/components/ui/accordion-item";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

const FAQS = [
  {
    question: "What does an AI automation agency actually do?",
    answer:
      "We audit your day-to-day operations, identify the repetitive, rules-based work eating up your team's time, then design and deploy AI agents and automations that handle it — wired directly into the tools you already use.",
  },
  {
    question: "How long does implementation take?",
    answer:
      "Most first agents go live within 2 weeks of kickoff. Larger, multi-workflow builds typically take 4-6 weeks, depending on how many systems we need to integrate with.",
  },
  {
    question: "Do I need any technical knowledge to work with Klyro?",
    answer:
      "No. We handle the engineering end-to-end — from mapping your workflows to building, testing, and maintaining the automations. You just tell us where the busywork is.",
  },
  {
    question: "What tools and platforms do you integrate with?",
    answer:
      "Most common CRMs, helpdesks, inboxes, spreadsheets, and internal APIs — including Salesforce, HubSpot, Zendesk, Slack, Notion, and custom-built systems via API.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. Every engagement includes a security review, and we follow least-privilege access on any system we connect to. Enterprise plans include a full compliance review on request.",
  },
  {
    question: "What if an automation doesn't work as expected?",
    answer:
      "Every workflow ships with monitoring and a human escalation path by default. If something misfires, it's flagged immediately and we tune the agent — that ongoing optimization is built into every plan.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-28 py-24 md:py-32">
      <div className="container">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          description="Can't find what you're looking for? Reach out and we'll get back to you within one business day."
        />

        <Reveal delay={0.1} className="mx-auto mt-14 max-w-2xl">
          {FAQS.map((faq, index) => (
            <AccordionItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() =>
                setOpenIndex((current) => (current === index ? null : index))
              }
            />
          ))}
        </Reveal>
      </div>
    </section>
  );
}

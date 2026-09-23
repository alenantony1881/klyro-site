import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientIdentifier } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Haiku by default: this is a public demo widget on a page anyone can open, so the
// cost profile matters more than the last few points of quality. Override with
// KLYRO_CHAT_MODEL=claude-sonnet-5 (or claude-opus-5) when demoing live.
const MODEL = process.env.KLYRO_CHAT_MODEL ?? "claude-haiku-4-5";

const MAX_TOKENS = 384; // system prompt asks for 2-4 sentences
const MAX_MESSAGE_CHARS = 600;
const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_CHARS = 4000;

const SYSTEM = `You are Klyro's AI assistant on the Klyro Automations website. You help prospective clients understand what Klyro does and guide them toward booking a free discovery call.

ABOUT KLYRO:
Klyro Automations is a specialist AI systems architecture practice based in London. We engineer deterministic, multi-agent operating systems that sit inside a business and run its repeatable work without supervision. We combine large language model design with production-grade backend engineering — a system needs both to be dependable, not just a demo.

WHAT WE BUILD (4 core systems):
1. Omnichannel Conversion Fleet — a single AI engine governs web chat, WhatsApp and email simultaneously. Reads enquiries, classifies intent, checks your knowledge base, replies accurately within seconds, and routes to booking, qualification or human handover. Build time: 2–3 weeks.
2. Autonomous Scheduling & Calendar Density — reads booking requests, cross-references live calendar availability, offers slots, confirms appointments, writes to your CRM. No human touches a diary. Build time: 1–2 weeks.
3. Zero-Touch Client Onboarding — the moment a contract is signed or payment clears, provisioning client folders, welcome sequences, communication channels, project boards all happen automatically. Build time: 2 weeks.
4. Custom Backend Cloud Infrastructure — bespoke API integration, automated data acquisition, containerised deployment, complex multi-agent orchestration. Build time: 3–6 weeks.
We also build custom automations beyond this catalogue — if the process is definable, we can generally engineer it.

SECTORS: Property management & real estate, professional services, B2B agencies, hospitality & short-let operators, and scaling startups.

HOW ENGAGEMENTS WORK:
- Two phases: The Build (a finite project) + The Infrastructure Retainer (ongoing management).
- Build covers architecture, API integration, prompt engineering, database config, stress testing, handover training.
- Retainer covers cloud hosting, AI token costs, monitoring, maintenance, knowledge-base updates, and a monthly optimisation call.
- Retainer starts 30 days after go-live. First 30 days covered by the Build. Minimum 3-month term, then cancel on 30 days' notice with full architecture export.
- Payment: 50/50 — deposit on proposal acceptance, final balance on successful deployment.
- Typical deployment: 2–3 weeks for core systems, 4–6 weeks for complex multi-agent ecosystems.

PRICING RULES — CRITICAL:
- NEVER quote specific prices. All figures are indicative and a binding number only comes in a written proposal after a discovery call.
- When asked about pricing, say it depends entirely on the scope — number of channels, integration difficulty, logic depth, data condition, and compliance needs. Encourage them to book the free discovery call to get a precise figure.
- You may say "investment varies based on your specific requirements" or "we structure it as a build fee plus a monthly retainer" but give NO numbers.

FREE WEBSITE BONUS — IMPORTANT:
- If the conversation is going well and the prospect seems genuinely interested in automation, mention naturally (NOT immediately, NOT in your first reply): as a bonus, Klyro includes a professionally designed website at no extra charge for automation clients. A website like this would normally cost £700–£800, but automation clients get it free. Frame it as added value, not a sales pitch.

KEY FAQ ANSWERS:
- AI subscriptions: Client does NOT pay for them separately. Retainer covers all backend subscriptions, API keys, hosting. One flat monthly fee.
- Integration: Works with almost any system that has an API or webhook. If something has no integration surface, we say so during discovery, not after payment.
- Hallucination: Agents are constrained to the client's knowledge base, forced through deterministic routing, and stress-tested before launch.
- Ownership: Client owns outputs, workflows and data. Perpetual licence on final payment. If they leave the retainer, architecture is packaged and handed over.
- Data: UK GDPR compliant, Data Protection Act 2018. Secure OAuth, data minimisation, never used for model training.
- International: London-based, contract under English law, but systems are cloud-hosted and we deploy internationally.

YOUR JOB:
- Answer questions about Klyro clearly and honestly using the knowledge above.
- If someone describes their business, ask ONE sharp question about their biggest time-drain, then suggest 1–2 concrete automations Klyro could build.
- Guide toward booking a FREE discovery call (30 minutes, no commitment, custom automation roadmap). There is a "Book a free automation audit" button on the page.
- If you don't know something specific, say so and suggest the discovery call.

STYLE:
- Warm, confident, concise. 2–4 short sentences per reply.
- Plain English, no jargon dumps, no emojis.
- Never over-promise, never invent client names or case studies.
- Sound like a knowledgeable consultant, not a chatbot.
- Contact: hello@klyroautomations.com for anything not covered here.`;

interface InMsg {
  role?: string;
  content?: unknown;
  text?: unknown;
}

function cannedReply(text: string): string {
  const q = text.toLowerCase();
  if (/(price|cost|pricing|how much|budget|charge|fee|invest)/.test(q)) {
    return "Investment depends entirely on your scope — the number of channels, integration complexity, and the logic your agents need to handle. We structure it as a build fee plus a monthly infrastructure retainer. The best way to get a precise figure is a free 30-minute discovery call — hit \"Book a free automation audit\" and we'll map it out.";
  }
  if (/(what do you|what does klyro|service|offer|capab|what can you)/.test(q)) {
    return "We engineer AI systems that run your repeatable work without supervision — omnichannel communication fleets across WhatsApp, email and web, autonomous scheduling, zero-touch client onboarding, and custom backend infrastructure. Everything integrates with your existing tools. What's the biggest time-drain in your business right now?";
  }
  if (/(start|begin|get going|onboard|next step|how do we|process|how does it work)/.test(q)) {
    return "It starts with a free 30-minute discovery call where we map your most repetitive tasks. From there we build the highest-impact system first — most core deployments are live within two to three weeks. Hit \"Book a free automation audit\" and we'll take it from there.";
  }
  if (/(website|web design|site|landing page)/.test(q)) {
    return "Great question — for our automation clients, we include a professionally designed website at no extra charge as part of the engagement. It's our way of making sure the rest of your digital presence matches the systems we build. Book a free discovery call and we can walk through what that looks like.";
  }
  if (/(property|real estate|lettings|tenant|landlord|estate agent)/.test(q)) {
    return "Property is one of our strongest sectors. We build systems that handle tenant enquiries, automate viewing bookings, qualify leads, and route conversations across WhatsApp, email and web — all integrated with your property management platform. What's taking up most of your team's time right now?";
  }
  if (/(integrate|crm|software|connect|api|tool|platform)/.test(q)) {
    return "In almost all cases, yes. Connecting disparate systems is our core discipline. If your CRM, property management platform or database exposes an API or webhook, we can bridge it. If something has no integration surface, we'll tell you during discovery rather than after you've paid.";
  }
  if (/(hallucin|wrong|mistake|accurate|trust|reliable|safe)/.test(q)) {
    return "We engineer against it rather than hope against it. Our agents are constrained to your own knowledge base, forced through deterministic routing, and stress-tested before launch specifically to provoke failure. The architecture is designed to contain and escalate, never to improvise.";
  }
  if (/(own|ownership|data|leave|cancel|exit)/.test(q)) {
    return "You own the outputs, the workflows and your data at all times. On final payment you receive a perpetual licence. If you later leave the retainer, we package the architecture and hand it over so you can host it internally or appoint another provider.";
  }
  if (/(how long|timeline|time|weeks|days|fast|quick)/.test(q)) {
    return "Most core systems are deployed within two to three weeks. Complex multi-agent ecosystems requiring bespoke database architecture typically take four to six weeks. A precise, committed timeline is issued in your proposal following the discovery call.";
  }
  if (/(analy|my business|help me|save|workflow|automate)/.test(q)) {
    return "Happy to help — what's the one task your team spends the most time on each week? Once I know that, I can suggest a concrete automation. Or book a free discovery call and we'll map it all out with you.";
  }
  return "I'm Klyro's AI assistant. We engineer AI systems that run your business's repeatable work — from omnichannel communication to autonomous scheduling to custom cloud infrastructure. Tell me about your business and I'll suggest where automation fits, or book a free discovery call and we'll map it out together.";
}

const NO_INDEX = { "X-Robots-Tag": "noindex" } as const;

/** Plain-text response the client reads with the same streaming reader. */
function textResponse(body: string, status = 200, extraHeaders: HeadersInit = {}) {
  return new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      ...NO_INDEX,
      ...extraHeaders,
    },
  });
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Rejects cross-origin POSTs. Trivially spoofed, but it stops drive-by scripts. */
function originAllowed(req: NextRequest): boolean {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) return true; // not configured (local dev) — don't block
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return true; // same-origin fetches may omit both
  return origin.startsWith(site);
}

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) {
    return textResponse("Forbidden", 403);
  }

  const body = await req.json().catch(() => ({}));

  const rawMessages: InMsg[] = Array.isArray(body?.messages) ? body.messages : [];
  const single = asText(body?.chatInput);

  let messages: Anthropic.MessageParam[] = rawMessages
    .map((m) => {
      const role = m.role === "agent" || m.role === "assistant" ? "assistant" : "user";
      const content = (asText(m.content) || asText(m.text)).slice(0, MAX_MESSAGE_CHARS);
      return { role: role as "user" | "assistant", content };
    })
    .filter((m) => m.content.trim().length > 0);

  if (single.trim()) {
    messages.push({ role: "user", content: single.slice(0, MAX_MESSAGE_CHARS) });
  }

  // Keep only the most recent turns, then trim from the front until under the
  // character budget. Both caps bound what we ever send to the API.
  messages = messages.slice(-MAX_HISTORY_MESSAGES);
  while (
    messages.length > 1 &&
    messages.reduce((n, m) => n + (m.content as string).length, 0) > MAX_HISTORY_CHARS
  ) {
    messages.shift();
  }

  // Anthropic requires the first message to be from the user.
  while (messages.length && messages[0].role === "assistant") messages.shift();

  const latest =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? single;
  const latestText = typeof latest === "string" ? latest : "";

  if (!messages.length) {
    return textResponse(cannedReply(latestText));
  }

  const rate = await checkRateLimit(clientIdentifier(req));
  if (!rate.ok) {
    return textResponse(
      "You're sending messages a bit quickly — give me a moment. In the meantime, the fastest way to get specifics is the free automation audit call: hit \"Book a call\" at the top.",
      429,
      { "Retry-After": String(rate.retryAfter) },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return textResponse(cannedReply(latestText));
  }

  try {
    const client = new Anthropic();
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        let sentAnything = false;
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta" &&
              event.delta.text
            ) {
              sentAnything = true;
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          if (!sentAnything) {
            controller.enqueue(encoder.encode(cannedReply(latestText)));
          }
        } catch (err) {
          console.error("Klyro chat stream error:", err);
          // Mid-stream failure: only safe to fall back if nothing was sent yet.
          if (!sentAnything) {
            controller.enqueue(encoder.encode(cannedReply(latestText)));
          }
        } finally {
          controller.close();
        }
      },
      cancel() {
        stream.abort();
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
        ...NO_INDEX,
      },
    });
  } catch (err) {
    console.error("Klyro chat error:", err);
    return textResponse(cannedReply(latestText));
  }
}

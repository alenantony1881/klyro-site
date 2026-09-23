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

const SYSTEM = `You are the Klyro Agent — the friendly AI concierge on Klyro's website.

ABOUT KLYRO:
- Klyro is an AI automation agency. We design, build, and run custom AI agents that
  take repetitive work off a team's plate — support, sales ops, lead follow-up,
  scheduling, data entry, internal workflows.
- We build on top of a business's existing tools (CRM, inbox, helpdesk) — no
  rip-and-replace. Everything important keeps a human approval step.
- How we work: Audit (map the repetitive work) → Build → Deploy → Operate (we
  monitor and improve it). Typical time to a first agent live: under 2 weeks.
- Pricing is tailored to scope: a one-off setup fee plus a monthly retainer to run
  and maintain it. Do NOT quote exact figures — instead offer the free automation
  audit call where they get a precise number.

YOUR JOB:
- Answer questions about what Klyro builds, how it works, and roughly how pricing
  works — clearly and honestly.
- If someone describes their business, ask ONE sharp question about their biggest
  time-drain, then suggest 1–2 concrete automations Klyro could build for them.
- Always gently guide toward the main call-to-action: booking a FREE automation
  audit call (there's a "Book a call" / "Book a free automation audit" button on the
  page).

STYLE:
- Warm, confident, concise. 2–4 short sentences per reply. Plain English, no jargon
  dumps, no emojis. Never over-promise or invent specific prices, client names, or
  guarantees. If unsure, suggest booking the free call.`;

interface InMsg {
  role?: string;
  content?: unknown;
  text?: unknown;
}

// Rule-based fallback so the chat still helps if no API key / API error / rate limit.
function cannedReply(text: string): string {
  const q = text.toLowerCase();
  if (/(price|cost|pricing|how much|budget|charge|fee)/.test(q)) {
    return "Pricing is tailored to what we automate — usually a one-off setup fee plus a small monthly retainer to run and improve it. The best way to get an exact number is a free automation audit call — want me to point you to the booking button?";
  }
  if (/(what|build|service|do you|offer|capab)/.test(q)) {
    return "We build custom AI agents that handle your repetitive work — support replies, lead follow-up, scheduling, and internal workflows — layered on top of the tools you already use, with a human approval step. Tell me your biggest time-drain and I'll suggest where AI fits.";
  }
  if (/(start|begin|get going|onboard|next step|how do we)/.test(q)) {
    return "It starts with a free automation audit: we map your most repetitive tasks, then build the highest-impact one first — usually live in under 2 weeks. Hit \"Book a call\" at the top and we'll take it from there.";
  }
  if (/(analy|my business|help me|time|save|workflow)/.test(q)) {
    return "Happy to help — what's the one task your team spends the most time on each week? Once I know that, I can suggest a concrete automation. Or book a free audit and we'll map it all out with you.";
  }
  return "Great question — I'm Klyro's automation agent. We build custom AI agents that take repetitive work off your team. Tell me about your business, or book a free automation audit and we'll show you exactly where AI saves you the most time.";
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

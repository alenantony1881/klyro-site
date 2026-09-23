"use client";

import { motion } from "framer-motion";
import { ArrowUp, Bot } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";

const WEBHOOK_URL = "/api/chat";

type Role = "agent" | "user";

interface Message {
  id: number;
  role: Role;
  text: string;
}

interface Chip {
  id: string;
  label: string;
}

const GREETING =
  "Hi — I'm Klyro's automation agent. Ask me what we build, what it costs, or tell me about your business and I'll show you where AI can save you the most time.";

const CHIPS: Chip[] = [
  { id: "services", label: "What do you build?" },
  { id: "pricing",  label: "How much does it cost?" },
  { id: "analyze",  label: "Analyze my business" },
  { id: "start",    label: "How do we get started?" },
];

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: "agent", text: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [usedChips, setUsedChips] = useState<string[]>([]);
  // stable session id so n8n can maintain conversation context
  const sessionId = useRef(`klyro-${Math.random().toString(36).slice(2)}`);

  const idRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const fetchReply = async (history: Message[]) => {
    setTyping(true);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // send the full conversation so the agent has context
          messages: history.map((m) => ({ role: m.role, content: m.text })),
          sessionId: sessionId.current,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("no stream");

      const decoder = new TextDecoder();
      const replyId = idRef.current++;
      let acc = "";
      let started = false;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        acc += chunk;

        if (!started) {
          // First token: swap the typing indicator for the message bubble.
          started = true;
          setTyping(false);
          setMessages((prev) => [
            ...prev,
            { id: replyId, role: "agent", text: acc },
          ]);
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === replyId ? { ...m, text: acc } : m)),
          );
        }
      }

      const tail = decoder.decode();
      if (tail) {
        acc += tail;
        setMessages((prev) =>
          prev.map((m) => (m.id === replyId ? { ...m, text: acc } : m)),
        );
      }

      if (!started) {
        setMessages((prev) => [
          ...prev,
          {
            id: replyId,
            role: "agent",
            text: "I'm having a little trouble right now — feel free to book a free call with the team instead.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: idRef.current++,
          role: "agent",
          text: "Something went wrong connecting to my backend. Please try again or book a free call with the team.",
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    const userMsg: Message = { id: idRef.current++, role: "user", text: trimmed };
    const next = [...messagesRef.current, userMsg];
    messagesRef.current = next;
    setMessages(next);
    void fetchReply(next);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
    setInput("");
  };

  const handleChip = (chip: Chip) => {
    setUsedChips((prev) => [...prev, chip.id]);
    send(chip.label);
  };

  const remainingChips = CHIPS.filter((c) => !usedChips.includes(c.id));

  return (
    <section id="assistant" className="relative scroll-mt-28 py-24 md:py-32">
      <div className="container">
        <SectionHeading
          eyebrow="AI concierge"
          title="Pricing, plans & a game plan — just ask"
          description="Skip the pricing table. Chat with Klyro's automation agent to see what we build, what it costs, and exactly where AI fits your business."
        />

        <Reveal delay={0.1} className="mx-auto mt-14 max-w-2xl">
          <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-1 rounded-[2rem] bg-[conic-gradient(from_180deg_at_50%_50%,rgba(132,204,22,0.35),rgba(168,85,247,0.35),rgba(132,204,22,0.35))] opacity-50 blur-xl"
          />
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-glow">
            {/* header */}
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-accent to-[#a855f7]">
                <Bot className="size-5 text-white" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Klyro Agent</p>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="size-1.5 rounded-full bg-green-500" />
                  Online · replies instantly
                </p>
              </div>
            </div>

            {/* messages */}
            <div
              ref={scrollRef}
              role="log"
              aria-live="polite"
              aria-label="Chat with Klyro Agent"
              className="flex h-[340px] flex-col gap-4 overflow-y-auto px-5 py-6"
            >
              {messages.map((message) => (
                <Message key={message.id} role={message.role} text={message.text} />
              ))}
              {typing ? <TypingBubble /> : null}
            </div>

            {/* quick replies */}
            {remainingChips.length > 0 ? (
              <div className="flex flex-wrap gap-2 px-5 pb-4">
                {remainingChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => handleChip(chip)}
                    disabled={typing}
                    className="cursor-pointer rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            ) : null}

            {/* input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-border p-3"
            >
              <label htmlFor="agent-input" className="sr-only">
                Message Klyro Agent
              </label>
              <input
                id="agent-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about services, pricing, or your business…"
                autoComplete="off"
                className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                aria-label="Send message"
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-lime text-[#08080a] transition-colors duration-200 hover:bg-lime-dim disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp className="size-5" aria-hidden="true" />
              </button>
            </form>
          </div>
          </div>

          <p className="mt-4 text-center text-sm text-muted">
            Prefer a human?{" "}
            <a
              href="#contact"
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              Book a free call
            </a>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Message({ role, text }: { role: Role; text: string }) {
  const isAgent = role === "agent";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.quick}
      className={cn("flex items-end gap-2.5", isAgent ? "self-start" : "self-end")}
    >
      {isAgent ? (
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-surface-2">
          <Bot className="size-3.5 text-accent" aria-hidden="true" />
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isAgent
            ? "rounded-tl-sm bg-surface-2 text-foreground"
            : "rounded-tr-sm bg-accent text-white"
        )}
      >
        {text}
      </div>
    </motion.div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2.5 self-start">
      <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-surface-2">
        <Bot className="size-3.5 text-accent" aria-hidden="true" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-surface-2 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-accent"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Sparkles, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "@/components/motion";
import { cn } from "@/lib/utils";

type Msg = {
  role: "user" | "assistant";
  content: string;
  products?: { title: string; slug: string; price: string; rating: number }[];
  orders?: { id: string; number: string; status: string }[];
  link?: { href: string; label: string } | null;
};

const STARTERS = ["Navy linen shirt under 6000", "Track my order", "Is cash on delivery available?", "How do returns work?", "Wireless earbuds with 4+ stars"];

/** Minimal markdown: **bold** only, rendered safely as React nodes. */
function renderText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>));
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm the Marqova assistant. Describe what you're looking for in plain words — I'll search the catalog, help with sizing and track orders." },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Braces matter: newer browsers return a Promise from smooth scrolling, and React would call it as a cleanup.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    const next = [...messages, { role: "user" as const, content: t }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12).map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      setMessages((m) => [...m, res.ok ? { role: "assistant", content: data.reply, products: data.products, orders: data.orders, link: data.link } : { role: "assistant", content: data.error ?? "Sorry, something went wrong." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I couldn't reach the server. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed right-4 bottom-20 z-40 flex items-center gap-2 rounded-full bg-navy-900 py-3 pr-4 pl-3 text-sm font-semibold text-white shadow-[var(--shadow-lift)] md:bottom-6"
        aria-expanded={open}
        aria-controls="assistant-panel"
        aria-label={open ? "Close shopping assistant" : "Open shopping assistant"}
      >
        <span className="grid size-7 place-items-center rounded-full bg-gold-500 text-navy-900">{open ? <X className="size-4" /> : <MessageCircle className="size-4" />}</span>
        <span className="hidden sm:inline">{open ? "Close" : "Ask Marqova"}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.section
            id="assistant-panel"
            role="dialog"
            aria-label="Marqova shopping assistant"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="fixed inset-x-3 bottom-36 z-40 flex max-h-[min(620px,70dvh)] flex-col overflow-hidden rounded-[14px] border border-sand bg-white shadow-[var(--shadow-lift)] sm:inset-x-auto sm:right-4 sm:w-[380px] md:bottom-20"
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          >
            <header className="flex items-center gap-3 bg-navy-900 px-4 py-3 text-white">
              <Sparkles className="size-5 text-gold-500" aria-hidden />
              <div>
                <p className="text-sm font-semibold">Shopping assistant</p>
                <p className="text-[11px] text-white/60">Answers from the live catalog</p>
              </div>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
              {messages.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[88%] rounded-[12px] px-3.5 py-2.5 text-sm leading-relaxed", m.role === "user" ? "rounded-br-sm bg-navy-900 text-white" : "rounded-bl-sm bg-sand-50 text-ink")}>
                    <p>{renderText(m.content)}</p>
                    {m.products && m.products.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {m.products.map((p) => (
                          <li key={p.slug}>
                            <Link href={`/p/${p.slug}`} onClick={() => setOpen(false)} className="flex items-center justify-between gap-2 rounded-md border border-sand bg-white px-2.5 py-2 text-xs hover:border-gold-500">
                              <span className="line-clamp-1 font-medium">{p.title}</span>
                              <span className="shrink-0 font-semibold">{p.price}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    {m.orders && m.orders.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {m.orders.map((o) => (
                          <li key={o.id}>
                            <Link href={`/account/orders/${o.id}`} onClick={() => setOpen(false)} className="flex justify-between rounded-md border border-sand bg-white px-2.5 py-2 text-xs hover:border-gold-500">
                              <span className="font-medium">{o.number}</span>
                              <span className="capitalize">{o.status}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    {m.link && (
                      <Link href={m.link.href} onClick={() => setOpen(false)} className="mt-2 inline-block text-xs font-semibold text-gold-text underline underline-offset-2">
                        {m.link.label} →
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-xs text-slate">
                  <Loader2 className="size-3.5 animate-spin" /> Searching…
                </div>
              )}
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {STARTERS.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-sand px-3 py-1.5 text-xs text-ink transition-colors hover:border-gold-500 hover:bg-gold-100">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2 border-t border-sand p-3"
            >
              <label htmlFor="assistant-input" className="sr-only">
                Message
              </label>
              <input
                id="assistant-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything…"
                maxLength={500}
                className="h-11 flex-1 rounded-[8px] border border-sand px-3 text-sm focus:border-gold-500 focus:outline-none"
              />
              <button type="submit" disabled={busy || !input.trim()} className="grid size-11 place-items-center rounded-[8px] bg-gold-500 text-navy-900 transition-colors hover:bg-gold-600 hover:text-white disabled:opacity-50" aria-label="Send">
                <Send className="size-4" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { replyInConversation } from "@/server/actions/shopper";
import { cn, formatDate } from "@/lib/utils";

export function ConversationThread({ id, title, messages }: { id: string; title: string; messages: { id: string; body: string; mine: boolean; author: string; at: string }[] }) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <section className="rounded-[8px] border border-sand bg-white">
      <h2 className="border-b border-sand px-5 py-3 text-sm font-semibold">{title}</h2>
      <ul className="max-h-80 space-y-2 overflow-y-auto p-5">
        {messages.map((m) => (
          <li key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[80%] rounded-[12px] px-3.5 py-2 text-sm", m.mine ? "bg-navy-900 text-white" : "bg-sand-50")}>
              <p>{m.body}</p>
              <p className={cn("mt-1 text-[10px]", m.mine ? "text-white/60" : "text-slate")}>
                {m.mine ? "You" : m.author} · {formatDate(m.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2 border-t border-sand p-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await replyInConversation(id, text);
            if (!res.ok) return void toast.error(res.error);
            setText("");
          });
        }}
      >
        <label htmlFor={`reply-${id}`} className="sr-only">Reply</label>
        <input id={`reply-${id}`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply…" className="h-11 flex-1 rounded-[8px] border border-sand px-3 text-sm focus:border-gold-500 focus:outline-none" />
        <button type="submit" disabled={pending || !text.trim()} className="grid size-11 place-items-center rounded-[8px] bg-navy-900 text-white disabled:opacity-50" aria-label="Send reply">
          <Send className="size-4" />
        </button>
      </form>
    </section>
  );
}

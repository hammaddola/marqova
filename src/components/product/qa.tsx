"use client";

import { useState, useTransition } from "react";
import { ChevronUp, MessageSquare, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/primitives";
import { answerQuestion, askQuestion, vote } from "@/server/actions/shopper";
import { formatDate } from "@/lib/utils";

export type QuestionItem = {
  id: string;
  body: string;
  upvotes: number;
  createdAt: string;
  isSample: boolean;
  answers: { id: string; body: string; isSeller: boolean; upvotes: number; author: string; createdAt: string }[];
};

export function QA({ productId, questions }: { productId: string; questions: QuestionItem[] }) {
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("");
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [pending, start] = useTransition();
  const shown = questions.filter((q) => !filter || q.body.toLowerCase().includes(filter.toLowerCase()) || q.answers.some((a) => a.body.toLowerCase().includes(filter.toLowerCase())));

  const up = (type: "question" | "answer", id: string) =>
    start(async () => {
      const res = await vote(type, id);
      if (!res.ok) return void toast.error(res.error);
      setVotes((v) => ({ ...v, [id]: res.data!.count }));
    });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <label htmlFor="qa-filter" className="sr-only">Search questions</label>
        <input id="qa-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Have a question? Search for answers" className="mb-4 h-11 w-full rounded-[8px] border border-sand px-3 text-sm focus:border-gold-500 focus:outline-none" />
        {shown.length === 0 && <p className="text-sm text-slate">No questions yet — be the first to ask.</p>}
        <ul className="space-y-5">
          {shown.map((q) => (
            <li key={q.id} className="flex gap-3">
              <button type="button" onClick={() => up("question", q.id)} className="flex h-fit flex-col items-center rounded-md border border-sand px-2 py-1 text-xs hover:border-gold-500" aria-label={`Upvote question (${votes[q.id] ?? q.upvotes} votes)`}>
                <ChevronUp className="size-4" aria-hidden />
                {votes[q.id] ?? q.upvotes}
              </button>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-semibold">Q: </span>
                  {q.body}
                  {q.isSample && <Badge tone="outline" className="ml-2">Sample</Badge>}
                </p>
                {q.answers.map((a) => (
                  <div key={a.id} className="mt-2 rounded-md bg-sand-50 p-3 text-sm">
                    <p>
                      <span className="font-semibold">A: </span>
                      {a.body}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-slate">
                      {a.isSeller ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-gold-text">
                          <Store className="size-3" aria-hidden /> Seller
                        </span>
                      ) : (
                        a.author
                      )}
                      · {formatDate(a.createdAt)}
                      <button type="button" onClick={() => up("answer", a.id)} className="ml-auto font-medium hover:text-ink">
                        Helpful ({votes[a.id] ?? a.upvotes})
                      </button>
                    </p>
                  </div>
                ))}
                {replyFor === q.id ? (
                  <form
                    className="mt-2 space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      start(async () => {
                        const res = await answerQuestion(q.id, reply);
                        if (!res.ok) return void toast.error(res.error);
                        toast.success("Answer posted");
                        setReply("");
                        setReplyFor(null);
                      });
                    }}
                  >
                    <label htmlFor={`ans-${q.id}`} className="sr-only">Your answer</label>
                    <Textarea id={`ans-${q.id}`} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Share what you know…" />
                    <div className="flex gap-2">
                      <Button size="sm" variant="navy" type="submit" loading={pending}>Post answer</Button>
                      <Button size="sm" variant="ghost" type="button" onClick={() => setReplyFor(null)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <button type="button" onClick={() => setReplyFor(q.id)} className="mt-2 text-xs font-semibold text-gold-text hover:underline">
                    Answer this question
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <form
        className="h-fit rounded-[8px] border border-sand bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await askQuestion(productId, text);
            if (!res.ok) return void toast.error(res.error);
            toast.success(res.message);
            setText("");
          });
        }}
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="size-4 text-gold-text" aria-hidden /> Ask a question
        </p>
        <p className="mt-1 mb-3 text-xs text-slate">The seller and verified owners will be notified.</p>
        <label htmlFor="qa-ask" className="sr-only">Your question</label>
        <Textarea id="qa-ask" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Is the fabric see-through in white?" maxLength={500} />
        <Button type="submit" variant="navy" className="mt-3 w-full" loading={pending} disabled={text.trim().length < 10}>
          Post question
        </Button>
      </form>
    </div>
  );
}

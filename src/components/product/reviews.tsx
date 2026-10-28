"use client";

import { useMemo, useState, useTransition } from "react";
import { BadgeCheck, Camera, Sparkles, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Stars } from "@/components/brand";
import { Badge } from "@/components/ui/primitives";
import { vote } from "@/server/actions/shopper";
import { cn, formatDate } from "@/lib/utils";

export type ReviewItem = {
  id: string;
  rating: number;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  fit: "RUNS_SMALL" | "TRUE_TO_SIZE" | "RUNS_LARGE" | null;
  heightCm: number | null;
  sizeBought: string | null;
  helpful: number;
  photos: string[];
  isSample: boolean;
};

const FIT_LABEL = { RUNS_SMALL: "Runs small", TRUE_TO_SIZE: "True to size", RUNS_LARGE: "Runs large" } as const;

export function Reviews({ reviews, summary, avg, total, apparel }: { reviews: ReviewItem[]; summary: { summary: string; topics: { label: string; sentiment: string; count: number }[] }; avg: number; total: number; apparel: boolean }) {
  const [stars, setStars] = useState<number | null>(null);
  const [photosOnly, setPhotosOnly] = useState(false);
  const [fit, setFit] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [helpful, setHelpful] = useState<Record<string, number>>({});
  const [, start] = useTransition();

  const hist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }));
  const fitCounts = (["RUNS_SMALL", "TRUE_TO_SIZE", "RUNS_LARGE"] as const).map((f) => ({ f, n: reviews.filter((r) => r.fit === f).length }));
  const fitTotal = fitCounts.reduce((s, x) => s + x.n, 0);

  const filtered = useMemo(
    () =>
      reviews.filter(
        (r) =>
          (stars == null || r.rating === stars) &&
          (!photosOnly || r.photos.length > 0) &&
          (!fit || r.fit === fit) &&
          (!topic || r.body.toLowerCase().includes(topic.toLowerCase().slice(0, 4))),
      ),
    [reviews, stars, photosOnly, fit, topic],
  );

  if (!total)
    return (
      <div className="max-w-2xl rounded-[8px] border border-sand bg-sand-50 p-6">
        <p className="font-semibold">No reviews yet</p>
        <p className="mt-1 text-sm leading-relaxed text-slate">
          Only shoppers whose order has been delivered can review this item, so every review you see here will come from a real buyer. Bought it?
          Choose “Write a review” on the order in your account.
        </p>
      </div>
    );

  return (
    <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <Stars value={avg} size={20} />
            <span className="text-lg font-semibold">{avg.toFixed(1)} out of 5</span>
          </div>
          <p className="mt-1 text-sm text-slate">{total} verified-buyer ratings</p>
        </div>
        <ul className="space-y-1.5">
          {hist.map(({ s, n }) => (
            <li key={s}>
              <button type="button" onClick={() => setStars(stars === s ? null : s)} aria-pressed={stars === s} className="flex w-full items-center gap-3 rounded px-1 py-0.5 text-sm hover:bg-sand-50">
                <span className="w-10 text-left text-gold-text">{s} star</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-sand-50">
                  <span className="block h-full rounded-full bg-gold-500" style={{ width: `${reviews.length ? (n / reviews.length) * 100 : 0}%` }} />
                </span>
                <span className="w-9 text-right text-xs text-slate tabular-nums">{reviews.length ? Math.round((n / reviews.length) * 100) : 0}%</span>
              </button>
            </li>
          ))}
        </ul>
        {apparel && fitTotal > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">How it fits</p>
            <div className="flex h-2.5 overflow-hidden rounded-full">
              {fitCounts.map(({ f, n }) => (
                <span key={f} className={f === "TRUE_TO_SIZE" ? "bg-emerald" : f === "RUNS_SMALL" ? "bg-crimson/70" : "bg-gold-500"} style={{ width: `${(n / fitTotal) * 100}%` }} />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-slate">
              {fitCounts.map(({ f, n }) => (
                <span key={f}>
                  {FIT_LABEL[f]} {Math.round((n / fitTotal) * 100)}%
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="rounded-[8px] bg-sand-50 p-3 text-xs text-slate">
          Only shoppers with a delivered order can review. We screen for review bursts and copied text, and never pay for reviews.
        </p>
      </div>

      <div>
        <div className="mb-5 rounded-[8px] border border-gold-500/40 bg-gold-100/50 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-4 text-gold-text" aria-hidden /> Customers say
          </p>
          <p className="mt-1 text-sm leading-relaxed">{summary.summary}</p>
          {summary.topics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.topics.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setTopic(topic === t.label ? null : t.label)}
                  aria-pressed={topic === t.label}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    topic === t.label ? "border-navy-900 bg-navy-900 text-white" : t.sentiment === "positive" ? "border-emerald/30 bg-white text-emerald" : t.sentiment === "negative" ? "border-crimson/30 bg-white text-crimson" : "border-sand bg-white text-ink",
                  )}
                >
                  {t.sentiment === "positive" ? "✓ " : t.sentiment === "negative" ? "! " : ""}
                  {t.label} ({t.count})
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-slate">AI-generated from the text of verified reviews.</p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setPhotosOnly(!photosOnly)} aria-pressed={photosOnly} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium", photosOnly ? "border-navy-900 bg-navy-900 text-white" : "border-sand bg-white")}>
            <Camera className="size-3.5" aria-hidden /> With photos
          </button>
          {apparel &&
            (["RUNS_SMALL", "TRUE_TO_SIZE", "RUNS_LARGE"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFit(fit === f ? null : f)} aria-pressed={fit === f} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", fit === f ? "border-navy-900 bg-navy-900 text-white" : "border-sand bg-white")}>
                {FIT_LABEL[f]}
              </button>
            ))}
          {(stars || photosOnly || fit || topic) && (
            <button type="button" onClick={() => (setStars(null), setPhotosOnly(false), setFit(null), setTopic(null))} className="px-2 text-xs font-semibold text-gold-text hover:underline">
              Clear filters
            </button>
          )}
        </div>

        <p className="mb-3 text-sm text-slate" aria-live="polite">
          Showing {filtered.length} of {reviews.length} reviews
        </p>
        <ul className="divide-y divide-sand">
          {filtered.slice(0, 30).map((r) => (
            <li key={r.id} className="py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-8 place-items-center rounded-full bg-navy-900 text-xs font-semibold text-white" aria-hidden>
                  {r.author.charAt(0)}
                </span>
                <span className="text-sm font-medium">{r.author}</span>
                <Badge tone="emerald">
                  <BadgeCheck aria-hidden /> Verified purchase
                </Badge>
                {r.isSample && <Badge tone="outline">Sample review</Badge>}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Stars value={r.rating} />
                <span className="text-sm font-semibold">{r.title}</span>
              </div>
              <p className="mt-1 text-xs text-slate">
                Reviewed {formatDate(r.createdAt)}
                {r.sizeBought && ` · Size bought: ${r.sizeBought}`}
                {r.heightCm && ` · Height: ${r.heightCm} cm`}
                {r.fit && ` · ${FIT_LABEL[r.fit]}`}
              </p>
              <p className="mt-2 text-sm leading-relaxed">{r.body}</p>
              {r.photos.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {r.photos.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={p} src={p} alt="Customer photo" className="size-20 rounded-md object-cover" loading="lazy" />
                  ))}
                </div>
              )}
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-sand px-3 py-1 text-xs hover:border-slate/40"
                onClick={() =>
                  start(async () => {
                    const res = await vote("review", r.id);
                    if (!res.ok) return void toast.error(res.error);
                    setHelpful((h) => ({ ...h, [r.id]: res.data!.count }));
                  })
                }
              >
                <ThumbsUp className="size-3.5" aria-hidden /> Helpful ({helpful[r.id] ?? r.helpful})
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

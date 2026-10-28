"use client";

import { ShieldCheck } from "lucide-react";
import { HoverInfo } from "@/components/ui/overlay";
import { trustComponents, trustLabel, TRUST_WEIGHTS, type TrustInputs } from "@/lib/trust-score";
import { cn } from "@/lib/utils";

/**
 * Trust Score badge; hovering (or focusing) shows exactly how the score was calculated.
 * `preview`: the inputs are example values on a preview listing, so the badge says so.
 */
export function TrustBadge({ score, inputs, subject = "seller", preview = false }: { score: number; inputs: TrustInputs; subject?: string; preview?: boolean }) {
  const c = trustComponents(inputs);
  const rows = [
    ["On-time delivery", `${Math.round(inputs.onTimeRate * 100)}%`, c.onTime, TRUST_WEIGHTS.onTime],
    ["Return rate", `${(inputs.returnRate * 100).toFixed(1)}%`, c.returns, TRUST_WEIGHTS.returns],
    ["Cancellation rate", `${(inputs.cancelRate * 100).toFixed(1)}%`, c.cancellations, TRUST_WEIGHTS.cancellations],
    ["Verified review rating", inputs.reviewRating > 0 ? `${inputs.reviewRating.toFixed(1)} / 5` : "No ratings yet", c.reviews, TRUST_WEIGHTS.reviews],
    ["Response time", `${Math.round(inputs.responseHours)}h`, c.response, TRUST_WEIGHTS.response],
  ] as const;
  return (
    <HoverInfo
      trigger={
        <button type="button" className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", score >= 85 ? "bg-emerald text-white" : score >= 70 ? "bg-emerald-50 text-emerald" : "bg-sand-50 text-slate")}>
          <ShieldCheck className="size-3.5" aria-hidden />
          {preview ? "Preview score" : "Trust Score"} {score}
          <span className="sr-only">. Hover or focus for the breakdown.</span>
        </button>
      }
    >
      <p className="font-semibold">
        Trust Score {score} · {trustLabel(score)}
      </p>
      <p className="mb-3 text-xs text-slate">
        {preview ? "Example values for a preview listing. Live scores are calculated from real orders over the last 180 days." : `How this ${subject} scores on the last 180 days of orders.`}
      </p>
      <ul className="space-y-2">
        {rows.map(([label, value, pts, max]) => (
          <li key={label}>
            <div className="flex justify-between text-xs">
              <span>{label}</span>
              <span className="font-medium">
                {value} · {pts.toFixed(0)}/{max}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sand-50">
              <div className="h-full rounded-full bg-emerald" style={{ width: `${(pts / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </HoverInfo>
  );
}

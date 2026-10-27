"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { calculateFees } from "@/lib/fees";
import { cn, formatPrice } from "@/lib/utils";

export function FeeCalculator({ categories, dark }: { categories: { id: string; name: string; commissionBps: number }[]; dark?: boolean }) {
  const [catId, setCatId] = useState(categories[0]?.id ?? "");
  const [price, setPrice] = useState("2500");
  const [qty, setQty] = useState("1");
  const cat = categories.find((c) => c.id === catId);
  const fees = calculateFees({ salePrice: Math.round(Number(price || 0) * 100), quantity: Math.max(1, Number(qty || 1)), commissionBps: cat?.commissionBps ?? 1000 });
  const field = cn("h-11 w-full rounded-[8px] border px-3 text-sm focus:outline-none", dark ? "border-white/20 bg-navy-800 text-white focus:border-gold-500" : "border-sand bg-white focus:border-gold-500");

  return (
    <div className={cn("rounded-[12px] p-6", dark ? "bg-navy-700 ring-1 ring-white/10" : "border border-sand bg-white")}>
      <p className="flex items-center gap-2 font-semibold">
        <Calculator className="size-5 text-gold-500" aria-hidden /> Fee calculator
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs sm:col-span-3">
          <span className={dark ? "text-white/70" : "text-slate"}>Category</span>
          <select value={catId} onChange={(e) => setCatId(e.target.value)} className={cn(field, "mt-1")}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {(c.commissionBps / 100).toFixed(1)}% commission
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs sm:col-span-2">
          <span className={dark ? "text-white/70" : "text-slate"}>Sale price (Rs)</span>
          <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} className={cn(field, "mt-1")} />
        </label>
        <label className="text-xs">
          <span className={dark ? "text-white/70" : "text-slate"}>Quantity</span>
          <input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} className={cn(field, "mt-1")} />
        </label>
      </div>
      <dl className="mt-5 space-y-1.5 text-sm">
        {[
          ["Sale total", fees.gross],
          [`Commission (${((cat?.commissionBps ?? 0) / 100).toFixed(1)}%)`, -fees.commission],
          ["Fixed fee (Rs 25 / item)", -fees.fixed],
          ["Payment processing (2%)", -fees.payment],
        ].map(([k, v]) => (
          <div key={k as string} className="flex justify-between">
            <dt className={dark ? "text-white/70" : "text-slate"}>{k}</dt>
            <dd className="tabular-nums">{(v as number) < 0 ? `−${formatPrice(-(v as number))}` : formatPrice(v as number)}</dd>
          </div>
        ))}
        <div className={cn("flex justify-between border-t pt-2 text-base font-semibold", dark ? "border-white/15" : "border-sand")}>
          <dt>You receive</dt>
          <dd className="text-gold-500 tabular-nums">{formatPrice(fees.net)}</dd>
        </div>
        <p className={cn("text-xs", dark ? "text-white/50" : "text-slate")}>Effective fee rate {(fees.effectiveRate * 100).toFixed(1)}%. No listing fees, no monthly subscription.</p>
      </dl>
    </div>
  );
}

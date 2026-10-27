"use client";

import { useState, useTransition } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bell, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { setPriceAlert } from "@/server/actions/shopper";
import { formatPrice } from "@/lib/utils";

export function PriceHistory({ points, current, productId }: { points: { price: number; at: string }[]; current: number; productId: string }) {
  const data = points.map((p) => ({ price: p.price / 100, label: new Date(p.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) }));
  const prices = points.map((p) => p.price);
  const low = Math.min(...prices, current);
  const high = Math.max(...prices, current);
  const isLow = current <= low;
  const [target, setTarget] = useState(String(Math.round((current * 0.9) / 100)));
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-[8px] border border-sand bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Price history</p>
          <p className="text-xs text-slate">
            Low {formatPrice(low)} · High {formatPrice(high)}
            {isLow && (
              <span className="ml-2 inline-flex items-center gap-1 font-semibold text-emerald">
                <TrendingDown className="size-3.5" aria-hidden /> Lowest price in 120 days
              </span>
            )}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm">
              <Bell /> Set a price alert
            </Button>
          </DialogTrigger>
          <DialogContent title="Set a price alert" description={`Current price: ${formatPrice(current)}. We'll notify you and send an email when it drops to your target.`}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const res = await setPriceAlert(productId, Number(target));
                  if (!res.ok) return void toast.error(res.error);
                  toast.success(res.message);
                  setOpen(false);
                });
              }}
            >
              <Label htmlFor="alert-target">Alert me at or below (Rs)</Label>
              <Input id="alert-target" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))} />
              <Button type="submit" variant="navy" className="mt-4 w-full" loading={pending}>
                Save alert
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="mt-3 h-28" role="img" aria-label={`Price chart from ${formatPrice(prices[0] ?? current)} to ${formatPrice(current)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="ph" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#C8A24A" stopOpacity={0.35} />
                <stop offset="1" stopColor="#C8A24A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#5B6575" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis hide domain={["dataMin - 500", "dataMax + 500"]} />
            <Tooltip formatter={(v) => [`Rs ${Number(v).toLocaleString("en-PK")}`, "Price"]} contentStyle={{ borderRadius: 8, border: "1px solid #E6E1D6", fontSize: 12 }} />
            <Area type="stepAfter" dataKey="price" stroke="#A8842F" strokeWidth={2} fill="url(#ph)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

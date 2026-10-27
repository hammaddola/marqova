"use client";

import Link from "next/link";
import { Ruler } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import type { SizeChart } from "@/lib/fit";

const LABELS: Record<string, string> = { chest: "Chest (cm)", waist: "Waist (cm)", hips: "Hips (cm)", footLength: "Foot length (cm)" };

export function SizeGuide({ chart, productId }: { chart: SizeChart; productId: string }) {
  const sizes = Object.keys(chart);
  const cols = [...new Set(sizes.flatMap((s) => Object.keys(chart[s])))];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="flex items-center gap-1 text-xs font-semibold text-gold-text hover:underline">
          <Ruler className="size-3.5" aria-hidden /> Size guide
        </button>
      </DialogTrigger>
      <DialogContent title="Size guide" description="Garment measurements. Compare with a similar item that fits you well.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Garment measurements by size</caption>
            <thead>
              <tr className="border-b border-sand text-left">
                <th scope="col" className="py-2 pr-4 font-semibold">Size</th>
                {cols.map((c) => (
                  <th key={c} scope="col" className="py-2 pr-4 font-semibold">{LABELS[c] ?? c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizes.map((s) => (
                <tr key={s} className="border-b border-sand/60">
                  <th scope="row" className="py-2 pr-4 font-semibold">{s}</th>
                  {cols.map((c) => (
                    <td key={c} className="py-2 pr-4 tabular-nums">{chart[s][c as keyof (typeof chart)[string]] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button asChild variant="gold" className="mt-5 w-full">
          <Link href={`/try-on?product=${productId}`}>Not sure? Find your size in the Try-On Studio</Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}

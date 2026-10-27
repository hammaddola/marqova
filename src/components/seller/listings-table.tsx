"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Box, ExternalLink, Pencil, Shirt } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/brand";
import { StatusPill } from "@/components/account/status-pill";
import { bulkListingAction } from "@/server/actions/seller";
import { cn, formatPrice } from "@/lib/utils";

type Row = { id: string; slug: string; title: string; status: string; price: number; quality: number; has3d: boolean; tryOn: boolean; stock: number; variants: number; sku: string; image: string | null; category: string; updatedAt: string; note: string | null };

export function ListingsTable({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [percent, setPercent] = useState("-10");
  const [pending, start] = useTransition();
  const all = rows.length > 0 && selected.size === rows.length;

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const run = (action: "activate" | "deactivate" | "delete" | "price") => {
    if (action === "delete" && !confirm(`Delete ${selected.size} listing(s)? Listings with past orders are archived instead.`)) return;
    start(async () => {
      const res = await bulkListingAction({ ids: [...selected], action, percent: action === "price" ? Number(percent) : undefined });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      setSelected(new Set());
    });
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="sticky top-16 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-[8px] bg-navy-900 px-4 py-2.5 text-sm text-white shadow-lg">
            <span className="font-semibold">{selected.size} selected</span>
            <span className="mx-2 h-5 w-px bg-white/20" />
            <Button size="sm" variant="gold" loading={pending} onClick={() => run("activate")}>Activate</Button>
            <Button size="sm" variant="outlineLight" disabled={pending} onClick={() => run("deactivate")}>Deactivate</Button>
            <span className="flex items-center gap-1">
              <label htmlFor="pct" className="sr-only">Price change percent</label>
              <input id="pct" value={percent} onChange={(e) => setPercent(e.target.value.replace(/[^\d-]/g, ""))} className="h-9 w-16 rounded-md bg-white/10 px-2 text-sm text-white" />
              <Button size="sm" variant="outlineLight" disabled={pending} onClick={() => run("price")}>% price</Button>
            </span>
            <Button size="sm" variant="danger" disabled={pending} onClick={() => run("delete")}>Delete</Button>
            <button type="button" className="ml-auto text-xs text-white/70 underline" onClick={() => setSelected(new Set())}>Clear</button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="overflow-x-auto rounded-[8px] border border-sand bg-white">
        <table className="w-full min-w-[880px] text-sm">
          <caption className="sr-only">Your listings</caption>
          <thead className="bg-sand-50 text-left text-xs text-slate uppercase">
            <tr>
              <th scope="col" className="w-10 p-3">
                <input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))} className="size-4 accent-navy-900" />
              </th>
              <th scope="col" className="p-3">Product</th>
              <th scope="col" className="p-3">Status</th>
              <th scope="col" className="p-3 text-right">Price</th>
              <th scope="col" className="p-3 text-right">Stock</th>
              <th scope="col" className="p-3">Quality</th>
              <th scope="col" className="p-3">3D / Try-on</th>
              <th scope="col" className="p-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {rows.map((r) => (
              <tr key={r.id} className={cn("transition-colors", selected.has(r.id) ? "bg-gold-100/40" : "hover:bg-sand-50/60")}>
                <td className="p-3">
                  <input type="checkbox" aria-label={`Select ${r.title}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="size-4 accent-navy-900" />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-sand-50">{r.image && <ProductImage src={r.image} alt="" sizes="44px" />}</span>
                    <span className="min-w-0">
                      <Link href={`/seller/listings/${r.id}`} className="line-clamp-1 font-medium hover:text-gold-text">{r.title}</Link>
                      <span className="block text-xs text-slate">{r.sku} · {r.variants} variant{r.variants === 1 ? "" : "s"} · {r.category}</span>
                      {r.note && <span className="block text-xs text-crimson">{r.note}</span>}
                    </span>
                  </div>
                </td>
                <td className="p-3"><StatusPill status={r.status} /></td>
                <td className="p-3 text-right tabular-nums">{formatPrice(r.price)}</td>
                <td className={cn("p-3 text-right font-medium tabular-nums", r.stock === 0 ? "text-crimson" : r.stock < 5 ? "text-amber" : "")}>{r.stock}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-sand-50">
                      <span className={cn("block h-full rounded-full", r.quality >= 75 ? "bg-emerald" : r.quality >= 50 ? "bg-gold-500" : "bg-crimson")} style={{ width: `${r.quality}%` }} />
                    </span>
                    <span className="text-xs tabular-nums">{r.quality}</span>
                  </div>
                </td>
                <td className="p-3">
                  <span className="flex gap-1.5 text-xs">
                    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5", r.has3d ? "bg-navy-900 text-white" : "bg-sand-50 text-slate")}><Box className="size-3" aria-hidden />{r.has3d ? "3D" : "No 3D"}</span>
                    {r.tryOn && <span className="inline-flex items-center gap-1 rounded bg-gold-100 px-1.5 py-0.5 text-gold-text"><Shirt className="size-3" aria-hidden />Try-on</span>}
                  </span>
                </td>
                <td className="p-3">
                  <span className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="iconSm"><Link href={`/seller/listings/${r.id}`} aria-label={`Edit ${r.title}`}><Pencil /></Link></Button>
                    {r.status === "ACTIVE" && <Button asChild variant="ghost" size="iconSm"><Link href={`/p/${r.slug}`} target="_blank" aria-label={`View ${r.title} in store`}><ExternalLink /></Link></Button>}
                  </span>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate">No listings here yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

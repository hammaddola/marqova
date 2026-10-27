"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Box, Check, SlidersHorizontal, Star, Truck, ShieldCheck, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FacetData = {
  brands: { value: string; count: number }[];
  priceRange: { min: number; max: number };
  attributes: { key: string; label: string; type: string; options: string[] }[];
};

const COLOR_HEX: Record<string, string> = {
  Navy: "#1C2A40", Black: "#1A1A1A", White: "#F4F4F2", Olive: "#5B6B3A", Maroon: "#6E1F2A", Sand: "#D8C9A8",
  Sky: "#7FA7C9", Rose: "#C98A94", Charcoal: "#3C4048", Emerald: "#1F7A5A", Gold: "#C8A24A", Silver: "#B8BCC2",
};

function useFilterNav() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const update = (mut: (sp: URLSearchParams) => void) => {
    const sp = new URLSearchParams(params.toString());
    mut(sp);
    sp.delete("page");
    start(() => router.push(`${pathname}?${sp.toString()}`, { scroll: false }));
  };
  const toggle = (key: string, value: string) =>
    update((sp) => {
      const vals = sp.getAll(key);
      sp.delete(key);
      const next = vals.includes(value) ? vals.filter((v) => v !== value) : [...vals, value];
      next.forEach((v) => sp.append(key, v));
    });
  const set = (key: string, value: string | null) => update((sp) => (value ? sp.set(key, value) : sp.delete(key)));
  return { params, pending, toggle, set, update };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-sand py-4 first:pt-0">
      <legend className="mb-3 text-sm font-semibold text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

function FilterBody({ facets, categoryLinks }: { facets: FacetData; categoryLinks?: React.ReactNode }) {
  const { params, toggle, set, update } = useFilterNav();
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");
  const checkCls = "flex cursor-pointer items-center gap-2.5 rounded px-1 py-1.5 text-sm text-ink hover:bg-sand-50";

  return (
    <div>
      {categoryLinks}
      <Section title="Shop smarter">
        <div className="space-y-1">
          {[
            ["visual", "3D / Try-on available", Box],
            ["fast", "Delivery in 1–2 days", Truck],
          ].map(([key, label, Icon]) => {
            const I = Icon as typeof Box;
            const on = params.get(key as string) === "1";
            return (
              <label key={key as string} className={checkCls}>
                <input type="checkbox" className="size-4 accent-navy-900" checked={on} onChange={() => set(key as string, on ? null : "1")} />
                <I className="size-4 text-gold-text" aria-hidden /> {label as string}
              </label>
            );
          })}
        </div>
      </Section>

      <Section title="Price (Rs)">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update((sp) => {
              if (min) sp.set("min", min);
              else sp.delete("min");
              if (max) sp.set("max", max);
              else sp.delete("max");
            });
          }}
        >
          <label className="sr-only" htmlFor="f-min">Minimum price</label>
          <input id="f-min" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder={String(Math.floor(facets.priceRange.min / 100))} className="h-10 w-full rounded-md border border-sand px-2 text-sm focus:border-gold-500 focus:outline-none" />
          <span className="text-slate">–</span>
          <label className="sr-only" htmlFor="f-max">Maximum price</label>
          <input id="f-max" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder={String(Math.ceil(facets.priceRange.max / 100))} className="h-10 w-full rounded-md border border-sand px-2 text-sm focus:border-gold-500 focus:outline-none" />
          <Button type="submit" size="sm" variant="secondary" className="h-10">Go</Button>
        </form>
      </Section>

      <Section title="Customer rating">
        {[4, 3, 2].map((r) => {
          const on = params.get("rating") === String(r);
          return (
            <button key={r} type="button" onClick={() => set("rating", on ? null : String(r))} className={cn(checkCls, "w-full", on && "font-semibold")} aria-pressed={on}>
              <span className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={cn("size-4", i <= r ? "text-gold-600" : "text-sand")} fill="currentColor" strokeWidth={0} />
                ))}
              </span>
              & up
            </button>
          );
        })}
      </Section>

      <Section title="Trust Score">
        {[85, 70].map((t) => {
          const on = params.get("trust") === String(t);
          return (
            <button key={t} type="button" onClick={() => set("trust", on ? null : String(t))} className={cn(checkCls, "w-full", on && "font-semibold")} aria-pressed={on}>
              <ShieldCheck className="size-4 text-emerald" aria-hidden /> {t}+ {t >= 85 ? "(Excellent)" : "(Good)"}
            </button>
          );
        })}
      </Section>

      {facets.brands.length > 0 && (
        <Section title="Brand">
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {facets.brands.map((b) => (
              <label key={b.value} className={checkCls}>
                <input type="checkbox" className="size-4 accent-navy-900" checked={params.getAll("brand").includes(b.value)} onChange={() => toggle("brand", b.value)} />
                <span className="flex-1 truncate">{b.value}</span>
                <span className="text-xs text-slate">{b.count}</span>
              </label>
            ))}
          </div>
        </Section>
      )}

      {facets.attributes.map((a) => (
        <Section key={a.key} title={a.label}>
          {a.type === "COLOR" ? (
            <div className="flex flex-wrap gap-2">
              {a.options.map((o) => {
                const on = params.getAll(`a_${a.key}`).includes(o);
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => toggle(`a_${a.key}`, o)}
                    aria-pressed={on}
                    aria-label={o}
                    title={o}
                    className={cn("relative grid size-8 place-items-center rounded-full border-2 transition-transform hover:scale-110", on ? "border-navy-900" : "border-sand")}
                    style={{ background: COLOR_HEX[o] ?? "#ccc" }}
                  >
                    {on && <Check className={cn("size-4", ["White", "Sand", "Silver", "Gold", "Sky"].includes(o) ? "text-navy-900" : "text-white")} />}
                  </button>
                );
              })}
            </div>
          ) : a.type === "SIZE" ? (
            <div className="flex flex-wrap gap-1.5">
              {a.options.map((o) => {
                const on = params.getAll(`a_${a.key}`).includes(o);
                return (
                  <button key={o} type="button" onClick={() => toggle(`a_${a.key}`, o)} aria-pressed={on} className={cn("h-9 min-w-11 rounded-md border px-2.5 text-sm transition-colors", on ? "border-navy-900 bg-navy-900 text-white" : "border-sand hover:border-slate/40")}>
                    {o}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-0.5">
              {a.options.slice(0, 12).map((o) => (
                <label key={o} className={checkCls}>
                  <input type="checkbox" className="size-4 accent-navy-900" checked={params.getAll(`a_${a.key}`).includes(o)} onChange={() => toggle(`a_${a.key}`, o)} />
                  {o}
                </label>
              ))}
            </div>
          )}
        </Section>
      ))}
    </div>
  );
}

export function FilterSidebar({ facets, activeCount, categoryLinks }: { facets: FacetData; activeCount: number; categoryLinks?: React.ReactNode }) {
  const { update } = useFilterNav();
  return (
    <aside className="hidden w-64 shrink-0 lg:block" aria-label="Filters">
      <div className="sticky top-32 max-h-[calc(100dvh-9rem)] overflow-y-auto pr-2">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Filters</p>
          {activeCount > 0 && (
            <button type="button" className="text-xs font-semibold text-gold-text hover:underline" onClick={() => update((sp) => [...sp.keys()].filter((k) => k !== "q" && k !== "sort" && k !== "category").forEach((k) => sp.delete(k)))}>
              Clear all
            </button>
          )}
        </div>
        <FilterBody facets={facets} categoryLinks={categoryLinks} />
      </div>
    </aside>
  );
}

export function FilterDrawer({ facets, activeCount, categoryLinks }: { facets: FacetData; activeCount: number; categoryLinks?: React.ReactNode }) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="secondary" size="sm" className="lg:hidden">
          <SlidersHorizontal /> Filters {activeCount > 0 && <span className="rounded-full bg-navy-900 px-1.5 text-[11px] text-white">{activeCount}</span>}
        </Button>
      </DrawerTrigger>
      <DrawerContent title="Filters">
        <div className="p-5">
          <FilterBody facets={facets} categoryLinks={categoryLinks} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function SortAndView({ sorts, current, view }: { sorts: Record<string, string>; current: string; view: "grid" | "list" }) {
  const { set } = useFilterNav();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="sr-only">Sort by</label>
      <select id="sort" value={current} onChange={(e) => set("sort", e.target.value === "relevance" ? null : e.target.value)} className="h-9 cursor-pointer rounded-md border border-sand bg-white px-2 text-sm focus:border-gold-500 focus:outline-none">
        {Object.entries(sorts).map(([k, v]) => (
          <option key={k} value={k}>
            Sort: {v}
          </option>
        ))}
      </select>
      <div className="hidden overflow-hidden rounded-md border border-sand sm:flex" role="group" aria-label="Layout">
        {(["grid", "list"] as const).map((v) => (
          <button key={v} type="button" onClick={() => set("view", v === "grid" ? null : v)} aria-pressed={view === v} className={cn("h-9 px-3 text-xs font-medium capitalize", view === v ? "bg-navy-900 text-white" : "bg-white hover:bg-sand-50")}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ActiveChips({ chips }: { chips: { key: string; value: string; label: string }[] }) {
  const { update } = useFilterNav();
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button
          key={`${c.key}-${c.value}`}
          type="button"
          onClick={() =>
            update((sp) => {
              const vals = sp.getAll(c.key).filter((v) => v !== c.value);
              sp.delete(c.key);
              vals.forEach((v) => sp.append(c.key, v));
            })
          }
          className="inline-flex items-center gap-1 rounded-full border border-sand bg-white px-3 py-1 text-xs font-medium hover:border-crimson hover:text-crimson"
        >
          {c.label} <X className="size-3" aria-hidden />
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
    </div>
  );
}

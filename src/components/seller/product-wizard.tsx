"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, Check, ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2, Wand2, Video } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ProductImage, Price } from "@/components/brand";
import { listingQuality } from "@/lib/listing-quality";
import { saveListing } from "@/server/actions/seller";
import { cn, formatPrice } from "@/lib/utils";

export type WizardCategory = { id: string; name: string; parent: string | null; attributes: { key: string; label: string; type: string; options: string[]; required: boolean; variantAxis: boolean; unit: string | null }[] };
type Variant = { id?: string; sku: string; options: Record<string, string>; price: string; compareAtPrice: string; stock: string; isActive: boolean };
type Media = { url: string; alt: string; type: "IMAGE" | "VIDEO" | "MODEL_3D" };
export type WizardInitial = {
  id?: string;
  categoryId: string;
  title: string;
  brand: string;
  description: string;
  bullets: string[];
  attributes: Record<string, string | string[]>;
  tags: string[];
  variants: Variant[];
  media: Media[];
  shippingFee: string;
  deliveryMinDays: string;
  deliveryMaxDays: string;
  returnWindowDays: string;
};

const STEPS = ["Category", "Details", "Variants", "Media", "Shipping", "Preview"];

export const EMPTY_INITIAL: WizardInitial = { categoryId: "", title: "", brand: "", description: "", bullets: ["", "", "", "", ""], attributes: {}, tags: [], variants: [], media: [], shippingFee: "0", deliveryMinDays: "2", deliveryMaxDays: "5", returnWindowDays: "30" };

export function ProductWizard({ categories, initial = EMPTY_INITIAL, startStep = 0 }: { categories: WizardCategory[]; initial?: WizardInitial; startStep?: number }) {
  const router = useRouter();
  const [step, setStep] = useState(initial.categoryId ? startStep || 1 : 0);
  const [dir, setDir] = useState(1);
  const [s, setS] = useState<WizardInitial>(initial);
  const [catQuery, setCatQuery] = useState("");
  // Per-listing tag so auto-generated SKUs don't clash between listings with similar titles.
  const [skuTag] = useState(() => Math.random().toString(36).slice(2, 6).toUpperCase());
  const [axisValues, setAxisValues] = useState<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {};
    for (const v of initial.variants)
      for (const [k, val] of Object.entries(v.options)) {
        out[k] ??= [];
        if (!out[k].includes(val)) out[k].push(val);
      }
    return out;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [bulk, setBulk] = useState({ price: "", stock: "" });
  const [pending, start] = useTransition();
  const category = categories.find((c) => c.id === s.categoryId);
  const axes = useMemo(() => category?.attributes.filter((a) => a.variantAxis) ?? [], [category]);
  const plain = useMemo(() => category?.attributes.filter((a) => !a.variantAxis) ?? [], [category]);
  const set = <K extends keyof WizardInitial>(k: K, v: WizardInitial[K]) => setS((x) => ({ ...x, [k]: v }));

  const quality = useMemo(
    () =>
      listingQuality({
        title: s.title,
        description: s.description,
        bullets: s.bullets,
        imageCount: s.media.filter((m) => m.type === "IMAGE").length,
        has3d: s.media.some((m) => m.type === "MODEL_3D"),
        attributesFilled: plain.filter((a) => s.attributes[a.key]).length + axes.filter((a) => axisValues[a.key]?.length).length,
        attributesRequired: (category?.attributes.length ?? 0) || 1,
        hasBrand: !!s.brand,
      }),
    [s, plain, axes, axisValues, category],
  );

  function regenerateVariants(values: Record<string, string[]>) {
    const active = axes.filter((a) => values[a.key]?.length);
    let combos: Record<string, string>[] = [{}];
    for (const a of active) combos = combos.flatMap((c) => values[a.key].map((v) => ({ ...c, [a.key]: v })));
    const base = `${s.title ? s.title.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase() : "SKU"}-${skuTag}`;
    setS((x) => ({
      ...x,
      variants: combos.slice(0, 200).map((c, i) => {
        const prev = x.variants.find((v) => JSON.stringify(v.options) === JSON.stringify(c));
        return prev ?? { sku: `${base}-${Object.values(c).map((v) => v.replace(/\s+/g, "").slice(0, 3).toUpperCase()).join("-") || i + 1}`, options: c, price: x.variants[0]?.price ?? "", compareAtPrice: "", stock: "10", isActive: true };
      }),
    }));
  }

  function toggleAxis(key: string, value: string) {
    const next = { ...axisValues, [key]: axisValues[key]?.includes(value) ? axisValues[key].filter((v) => v !== value) : [...(axisValues[key] ?? []), value] };
    setAxisValues(next);
    regenerateVariants(next);
  }

  function go(n: number) {
    if (n > step) {
      if (step === 0 && !s.categoryId) return void toast.error("Choose a category to continue.");
      if (step === 2 && !s.variants.length) {
        if (axes.length) return void toast.error("Pick at least one value for each option.");
        setS((x) => ({ ...x, variants: [{ sku: `SKU-${Date.now().toString(36).toUpperCase()}`, options: {}, price: "", compareAtPrice: "", stock: "10", isActive: true }] }));
      }
    }
    setDir(n > step ? 1 : -1);
    setStep(n);
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files).slice(0, 12)) {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) toast.error(`${file.name}: ${data.error}`);
      else setS((x) => ({ ...x, media: [...x.media, { url: data.url, alt: x.title || file.name, type: data.type }] }));
    }
    setUploading(false);
  }

  function submit(publish: boolean) {
    start(async () => {
      const res = await saveListing({
        id: s.id,
        categoryId: s.categoryId,
        title: s.title,
        brand: s.brand,
        description: s.description,
        bullets: s.bullets.filter((b) => b.trim()),
        attributes: s.attributes,
        tags: s.tags,
        shippingFee: Number(s.shippingFee || 0),
        deliveryMinDays: Number(s.deliveryMinDays || 2),
        deliveryMaxDays: Number(s.deliveryMaxDays || 5),
        returnWindowDays: Number(s.returnWindowDays || 30),
        variants: s.variants.map((v) => ({ id: v.id, sku: v.sku, options: v.options, price: Number(v.price), compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null, stock: Number(v.stock || 0), isActive: v.isActive })),
        media: s.media,
        publish,
      });
      if (!res.ok) {
        setErrors(res.fields ?? {});
        const first = Object.keys(res.fields ?? {})[0] ?? "";
        if (first.startsWith("variants")) setStep(2);
        else if (["title", "description", "brand"].includes(first)) setStep(1);
        return void toast.error(res.error);
      }
      const d = res.data!;
      toast.success(d.status === "ACTIVE" ? "Listing is live" : d.status === "NEEDS_ATTENTION" ? "Saved — some details are missing before it can go live" : "Draft saved", { description: `Listing quality ${d.score}/100` });
      router.push(`/seller/listings/${d.id}?saved=1`);
      router.refresh();
    });
  }

  const filteredCats = categories.filter((c) => !catQuery || `${c.parent} ${c.name}`.toLowerCase().includes(catQuery.toLowerCase()));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <div className="rounded-[8px] border border-sand bg-white">
        <ol className="flex overflow-x-auto border-b border-sand scrollbar-none" aria-label="Steps">
          {STEPS.map((label, i) => (
            <li key={label} className="flex-1">
              <button type="button" onClick={() => go(i)} aria-current={i === step ? "step" : undefined} className={cn("flex w-full items-center justify-center gap-2 px-3 py-3 text-xs font-medium whitespace-nowrap", i === step ? "border-b-2 border-gold-500 text-ink" : "text-slate")}>
                <span className={cn("grid size-5 place-items-center rounded-full text-[10px]", i < step ? "bg-emerald text-white" : i === step ? "bg-navy-900 text-white" : "bg-sand-50")}>{i < step ? <Check className="size-3" /> : i + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>
        <div className="relative min-h-[420px] overflow-hidden p-5 sm:p-6">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div key={step} custom={dir} initial={{ opacity: 0, x: 24 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 * dir }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <div>
                  <Field label="Find a category" htmlFor="cat-q">
                    <Input id="cat-q" value={catQuery} onChange={(e) => setCatQuery(e.target.value)} placeholder="e.g. sneakers, skincare, sofa" />
                  </Field>
                  <div className="mt-4 grid max-h-[340px] gap-2 overflow-y-auto sm:grid-cols-2">
                    {filteredCats.map((c) => (
                      <button key={c.id} type="button" onClick={() => (set("categoryId", c.id), setAxisValues({}), set("variants", []), set("attributes", {}))} aria-pressed={s.categoryId === c.id} className={cn("rounded-[8px] border p-3 text-left text-sm transition-colors", s.categoryId === c.id ? "border-navy-900 ring-1 ring-navy-900" : "border-sand hover:border-slate/40")}>
                        <span className="text-xs text-slate">{c.parent}</span>
                        <span className="block font-medium">{c.name}</span>
                        <span className="text-xs text-slate">{c.attributes.length} attributes · {c.attributes.filter((a) => a.variantAxis).map((a) => a.label).join(" × ") || "single variant"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Title" htmlFor="w-title" error={errors.title} hint={`${s.title.length}/200 · brand + product + key feature`} className="sm:col-span-2">
                    <Input id="w-title" value={s.title} maxLength={200} onChange={(e) => set("title", e.target.value)} />
                  </Field>
                  <Field label="Brand" htmlFor="w-brand">
                    <Input id="w-brand" value={s.brand} onChange={(e) => set("brand", e.target.value)} placeholder="or “Unbranded”" />
                  </Field>
                  <Field label="Search tags (comma separated)" htmlFor="w-tags">
                    <Input id="w-tags" value={s.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 30))} />
                  </Field>
                  <fieldset className="sm:col-span-2">
                    <legend className="mb-1.5 text-sm font-medium">About this item (bullets)</legend>
                    <div className="space-y-2">
                      {s.bullets.map((b, i) => (
                        <Input key={i} aria-label={`Bullet ${i + 1}`} value={b} maxLength={250} onChange={(e) => set("bullets", s.bullets.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Benefit ${i + 1}`} />
                      ))}
                    </div>
                  </fieldset>
                  <Field label="Description" htmlFor="w-desc" error={errors.description} hint={`${s.description.length} characters · 200+ recommended`} className="sm:col-span-2">
                    <Textarea id="w-desc" rows={6} value={s.description} onChange={(e) => set("description", e.target.value)} />
                  </Field>
                  {plain.map((a) => (
                    <Field key={a.key} label={`${a.label}${a.required ? " *" : ""}${a.unit ? ` (${a.unit})` : ""}`} htmlFor={`attr-${a.key}`}>
                      {a.type === "SELECT" || a.type === "BOOLEAN" ? (
                        <Select id={`attr-${a.key}`} value={String(s.attributes[a.key] ?? "")} onChange={(e) => set("attributes", { ...s.attributes, [a.key]: e.target.value })}>
                          <option value="">Choose…</option>
                          {(a.type === "BOOLEAN" ? ["Yes", "No"] : a.options).map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </Select>
                      ) : a.type === "MULTISELECT" ? (
                        <div className="flex flex-wrap gap-1.5">
                          {a.options.map((o) => {
                            const cur = ([] as string[]).concat(s.attributes[a.key] ?? []);
                            const on = cur.includes(o);
                            return (
                              <button key={o} type="button" aria-pressed={on} onClick={() => set("attributes", { ...s.attributes, [a.key]: on ? cur.filter((x) => x !== o) : [...cur, o] })} className={cn("rounded-full border px-3 py-1 text-xs", on ? "border-navy-900 bg-navy-900 text-white" : "border-sand")}>
                                {o}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <Input id={`attr-${a.key}`} inputMode={a.type === "NUMBER" ? "decimal" : undefined} value={String(s.attributes[a.key] ?? "")} onChange={(e) => set("attributes", { ...s.attributes, [a.key]: e.target.value })} />
                      )}
                    </Field>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  {axes.map((a) => (
                    <fieldset key={a.key}>
                      <legend className="mb-2 text-sm font-medium">{a.label}</legend>
                      <div className="flex flex-wrap gap-1.5">
                        {a.options.map((o) => {
                          const on = axisValues[a.key]?.includes(o);
                          return (
                            <button key={o} type="button" aria-pressed={on} onClick={() => toggleAxis(a.key, o)} className={cn("h-9 min-w-11 rounded-md border px-3 text-sm", on ? "border-navy-900 bg-navy-900 text-white" : "border-sand hover:border-slate/40")}>
                              {o}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                  {!axes.length && <p className="text-sm text-slate">This category has no variant options — set the price and stock below.</p>}
                  {s.variants.length > 0 && (
                    <div className="overflow-x-auto rounded-[8px] border border-sand">
                      <div className="flex items-center gap-2 border-b border-sand bg-sand-50 p-2 text-xs">
                        <span className="font-semibold">{s.variants.length} variants</span>
                        <span className="ml-auto">Apply to all:</span>
                        <input aria-label="Price for all variants" placeholder="Price" inputMode="decimal" value={bulk.price} onChange={(e) => setBulk({ ...bulk, price: e.target.value.replace(/[^\d.]/g, "") })} className="h-8 w-24 rounded border border-sand px-2" />
                        <input aria-label="Stock for all variants" placeholder="Stock" inputMode="numeric" value={bulk.stock} onChange={(e) => setBulk({ ...bulk, stock: e.target.value.replace(/\D/g, "") })} className="h-8 w-20 rounded border border-sand px-2" />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8"
                          disabled={!bulk.price && !bulk.stock}
                          onClick={() => {
                            set("variants", s.variants.map((v) => ({ ...v, price: bulk.price || v.price, stock: bulk.stock || v.stock })));
                            setBulk({ price: "", stock: "" });
                          }}
                        >
                          Apply
                        </Button>
                      </div>
                      <table className="w-full min-w-[600px] text-sm">
                        <thead className="text-left text-xs text-slate">
                          <tr>
                            <th scope="col" className="p-2">Variant</th>
                            <th scope="col" className="p-2">SKU</th>
                            <th scope="col" className="p-2">Price (Rs)</th>
                            <th scope="col" className="p-2">Was (Rs)</th>
                            <th scope="col" className="p-2">Stock</th>
                            <th scope="col" className="p-2">On</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.variants.map((v, i) => {
                            const upd = (patch: Partial<Variant>) => set("variants", s.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                            return (
                              <tr key={i} className="border-t border-sand">
                                <td className="p-2 font-medium">{Object.values(v.options).join(" / ") || "Standard"}</td>
                                <td className="p-2"><input aria-label="SKU" value={v.sku} onChange={(e) => upd({ sku: e.target.value })} className={cn("h-9 w-32 rounded border px-2", errors[`variants.${i}.sku`] ? "border-crimson" : "border-sand")} /></td>
                                <td className="p-2"><input aria-label="Price" inputMode="decimal" value={v.price} onChange={(e) => upd({ price: e.target.value.replace(/[^\d.]/g, "") })} className={cn("h-9 w-24 rounded border px-2", errors[`variants.${i}.price`] ? "border-crimson" : "border-sand")} /></td>
                                <td className="p-2"><input aria-label="Compare-at price" inputMode="decimal" value={v.compareAtPrice} onChange={(e) => upd({ compareAtPrice: e.target.value.replace(/[^\d.]/g, "") })} className="h-9 w-24 rounded border border-sand px-2" /></td>
                                <td className="p-2"><input aria-label="Stock" inputMode="numeric" value={v.stock} onChange={(e) => upd({ stock: e.target.value.replace(/\D/g, "") })} className="h-9 w-20 rounded border border-sand px-2" /></td>
                                <td className="p-2"><input type="checkbox" aria-label="Active" checked={v.isActive} onChange={(e) => upd({ isActive: e.target.checked })} className="size-4 accent-navy-900" /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <label className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border-2 border-dashed border-sand bg-sand-50 p-8 text-center transition-colors hover:border-gold-500", uploading && "pointer-events-none opacity-60")}>
                    {uploading ? <Loader2 className="size-8 animate-spin text-gold-text" /> : <ImagePlus className="size-8 text-gold-text" aria-hidden />}
                    <span className="text-sm font-medium">Drop images, an MP4 video or a GLB/USDZ 3D model</span>
                    <span className="text-xs text-slate">Images are resized to WebP automatically. 6+ images from different angles score best.</span>
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,.glb,.usdz" className="sr-only" onChange={(e) => upload(e.target.files)} />
                  </label>
                  <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {s.media.map((m, i) => (
                      <li key={m.url + i} className="group relative aspect-square overflow-hidden rounded-md border border-sand bg-sand-50">
                        {m.type === "IMAGE" ? <ProductImage src={m.url} alt={m.alt} sizes="120px" /> : (
                          <span className="grid h-full place-items-center text-xs text-slate">
                            {m.type === "VIDEO" ? <Video className="size-6" /> : <Box className="size-6" />}
                            {m.type === "VIDEO" ? "Video" : "3D model"}
                          </span>
                        )}
                        {i === 0 && m.type === "IMAGE" && <span className="absolute top-1 left-1 rounded bg-navy-900 px-1.5 text-[10px] text-white">Main</span>}
                        <button type="button" onClick={() => set("media", s.media.filter((_, j) => j !== i))} className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-white/95 opacity-0 shadow group-hover:opacity-100 focus:opacity-100" aria-label="Remove media">
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-slate">Add by URL</summary>
                    <form
                      className="mt-2 flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const url = new FormData(e.currentTarget).get("url") as string;
                        if (!/^https:\/\//.test(url)) return void toast.error("Use an https:// URL");
                        set("media", [...s.media, { url, alt: s.title, type: url.endsWith(".glb") ? "MODEL_3D" : "IMAGE" }]);
                        e.currentTarget.reset();
                      }}
                    >
                      <Input name="url" placeholder="https://…" aria-label="Media URL" />
                      <Button type="submit" variant="secondary">Add</Button>
                    </form>
                  </details>
                </div>
              )}

              {step === 4 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Delivery fee per parcel (Rs)" htmlFor="w-ship" hint="Shown on every product card. Free above Rs 2,500 for standard delivery.">
                    <Input id="w-ship" inputMode="decimal" value={s.shippingFee} onChange={(e) => set("shippingFee", e.target.value.replace(/[^\d.]/g, ""))} />
                  </Field>
                  <Field label="Return window (days)" htmlFor="w-ret">
                    <Select id="w-ret" value={s.returnWindowDays} onChange={(e) => set("returnWindowDays", e.target.value)}>
                      {["7", "14", "30", "60"].map((d) => <option key={d} value={d}>{d} days</option>)}
                    </Select>
                  </Field>
                  <Field label="Delivery time — from (business days)" htmlFor="w-dmin">
                    <Input id="w-dmin" inputMode="numeric" value={s.deliveryMinDays} onChange={(e) => set("deliveryMinDays", e.target.value.replace(/\D/g, ""))} />
                  </Field>
                  <Field label="Delivery time — to (business days)" htmlFor="w-dmax">
                    <Input id="w-dmax" inputMode="numeric" value={s.deliveryMaxDays} onChange={(e) => set("deliveryMaxDays", e.target.value.replace(/\D/g, ""))} />
                  </Field>
                </div>
              )}

              {step === 5 && (
                <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                  <div className="relative aspect-square overflow-hidden rounded-[8px] border border-sand bg-sand-50">
                    {s.media.find((m) => m.type === "IMAGE") && <ProductImage src={s.media.find((m) => m.type === "IMAGE")!.url} alt={s.title} sizes="220px" />}
                  </div>
                  <div>
                    <p className="text-xs text-slate">{category?.parent} › {category?.name}</p>
                    <h2 className="heading-display mt-1 text-2xl">{s.title || "Untitled product"}</h2>
                    {s.variants[0]?.price && <Price value={Math.round(Math.min(...s.variants.map((v) => Number(v.price) || Infinity)) * 100)} size="lg" className="mt-2" />}
                    <p className="mt-1 text-xs text-slate">+ {Number(s.shippingFee) ? formatPrice(Number(s.shippingFee) * 100) : "FREE"} delivery · {s.deliveryMinDays}–{s.deliveryMaxDays} days · {s.returnWindowDays}-day returns</p>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{s.bullets.filter(Boolean).map((b) => <li key={b}>{b}</li>)}</ul>
                    <p className="mt-3 line-clamp-4 text-sm text-slate">{s.description}</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sand p-4">
          <Button variant="ghost" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0}>
            <ChevronLeft /> Back
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => submit(false)} loading={pending} disabled={!s.categoryId || !s.variants.length}>
              Save draft
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="navy" onClick={() => go(step + 1)}>
                Continue <ChevronRight />
              </Button>
            ) : (
              <Button variant="gold" onClick={() => submit(true)} loading={pending}>
                Publish
              </Button>
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <div className="rounded-[8px] border border-sand bg-white p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Wand2 className="size-4 text-gold-text" aria-hidden /> Listing quality
          </p>
          <div className="mt-3 flex items-end gap-2">
            <motion.span key={quality.score} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className={cn("text-4xl font-semibold tabular-nums", quality.score >= 75 ? "text-emerald" : quality.score >= 50 ? "text-gold-text" : "text-crimson")}>
              {quality.score}
            </motion.span>
            <span className="pb-1 text-sm text-slate">/ 100</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand-50">
            <motion.div className={cn("h-full rounded-full", quality.score >= 75 ? "bg-emerald" : quality.score >= 50 ? "bg-gold-500" : "bg-crimson")} animate={{ width: `${quality.score}%` }} />
          </div>
          <ul className="mt-4 space-y-2 text-xs text-slate">
            {quality.tips.slice(0, 5).map((t) => (
              <li key={t} className="flex gap-2"><span className="text-gold-text">•</span>{t}</li>
            ))}
            {!quality.tips.length && <li className="text-emerald">Excellent — this listing has everything shoppers need.</li>}
          </ul>
        </div>
        {s.id && (
          <Link href="/seller/listings" className="block text-center text-sm text-gold-text hover:underline">
            ← Back to listings
          </Link>
        )}
      </aside>
    </div>
  );
}

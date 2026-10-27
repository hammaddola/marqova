"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, RotateCw, Save, ShoppingBag, Trash2, Upload, X, Layers, Eye } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/brand";
import { addToCart } from "@/server/actions/cart";
import { saveAvatar } from "@/server/actions/shopper";
import { DEFAULT_SIZE_CHARTS, estimateBody, fitAdvice, fitForSize, recommendSize, type AvatarBodyType, type BodyShapeType, type GarmentKind } from "@/lib/fit";
import { cn, formatPrice } from "@/lib/utils";
import { FIT_COLORS, type WornGarment } from "./scene";

const Scene = dynamic(() => import("./scene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-white/60">
      <Loader2 className="size-8 animate-spin" aria-label="Loading 3D studio" />
    </div>
  ),
});

export type StudioProduct = {
  id: string;
  slug: string;
  title: string;
  price: number;
  image: string | null;
  kind: GarmentKind;
  variants: { id: string; size: string | null; color: string | null; colorHex: string | null; stock: number }[];
};

type Avatar = { body: AvatarBodyType; heightCm: number; weightKg: number; shape: BodyShapeType };

const SKIN = ["#F1D3B8", "#D9A97E", "#B07B53", "#7A4E33"];
const DEFAULTS: Record<AvatarBodyType, Avatar> = {
  MEN: { body: "MEN", heightCm: 176, weightKg: 74, shape: "REGULAR" },
  WOMEN: { body: "WOMEN", heightCm: 163, weightKg: 60, shape: "REGULAR" },
  KIDS: { body: "KIDS", heightCm: 128, weightKg: 26, shape: "REGULAR" },
};

export function Studio({ products, initialProductId, savedAvatar, signedIn }: { products: StudioProduct[]; initialProductId?: string; savedAvatar: Avatar | null; signedIn: boolean }) {
  const [avatar, setAvatar] = useState<Avatar>(savedAvatar ?? DEFAULTS.MEN);
  const [skin, setSkin] = useState(SKIN[1]);
  const [spin, setSpin] = useState(false);
  const [fitMap, setFitMap] = useState(true);
  const initial = products.find((p) => p.id === initialProductId) ?? products[0];
  // The "look": one garment per slot (top/bottom/dress/shoes), each with a chosen size.
  const [look, setLook] = useState<Record<string, { productId: string; size: string | null }>>(initial ? { [slot(initial.kind)]: { productId: initial.id, size: null } } : {});
  const [focusId, setFocusId] = useState(initial?.id);
  const [photo, setPhoto] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [preview, setPreview] = useState<{ url: string; note?: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const body = useMemo(() => estimateBody(avatar), [avatar]);

  const worn = Object.values(look)
    .map(({ productId, size }) => {
      const p = products.find((x) => x.id === productId);
      if (!p) return null;
      const chart = p.kind === "ACCESSORY" ? null : DEFAULT_SIZE_CHARTS[p.kind];
      const rec = chart ? recommendSize(chart, body).recommended : null;
      const chosen = size ?? rec;
      const fit = chart && chosen && chart[chosen] ? fitForSize(chart, chosen, body) : null;
      const variant = p.variants.find((v) => v.size === chosen && v.stock > 0) ?? p.variants.find((v) => v.size === chosen) ?? p.variants.find((v) => v.stock > 0);
      return { p, chart, rec, chosen, fit, variant };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const garments: WornGarment[] = worn
    .filter((w) => w.p.kind !== "ACCESSORY")
    .map((w) => ({ kind: w.p.kind, color: w.variant?.colorHex ?? "#1C2A40", regions: Object.fromEntries((w.fit?.regions ?? []).map((r) => [r.region, r.level])) }));

  const focus = worn.find((w) => w.p.id === focusId) ?? worn[0];

  function wear(p: StudioProduct) {
    setLook((l) => {
      const next = { ...l };
      if (p.kind === "DRESS") {
        delete next.top;
        delete next.bottom;
      }
      if (p.kind === "TOP" || p.kind === "BOTTOM") delete next.dress;
      next[slot(p.kind)] = { productId: p.id, size: null };
      return next;
    });
    setFocusId(p.id);
  }

  function setBody(b: AvatarBodyType) {
    setAvatar(DEFAULTS[b]);
  }

  async function renderPhoto() {
    if (!photo || !focus) return;
    const res = await fetch("/api/try-on", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: focus.p.id, personPhoto: photo, avatar }) });
    const data = await res.json();
    if (!res.ok) return void toast.error(data.error ?? "Try-on failed");
    setPreview({ url: data.imageUrl, note: data.note });
  }

  return (
    <div className="studio-dark min-h-[calc(100dvh-7rem)]">
      <div className="container-page grid gap-6 py-6 lg:grid-cols-[300px_1fr_340px]">
        {/* Avatar controls */}
        <section aria-labelledby="avatar-h" className="space-y-5 rounded-[12px] bg-navy-800 p-5 ring-1 ring-white/10">
          <h2 id="avatar-h" className="font-display text-xl">Your avatar</h2>
          <div role="radiogroup" aria-label="Avatar type" className="grid grid-cols-3 gap-1 rounded-[8px] bg-navy-900 p-1">
            {(["MEN", "WOMEN", "KIDS"] as const).map((b) => (
              <button key={b} role="radio" aria-checked={avatar.body === b} onClick={() => setBody(b)} className={cn("relative rounded-md py-2 text-sm font-medium capitalize", avatar.body === b ? "text-navy-900" : "text-white/70 hover:text-white")}>
                {avatar.body === b && <motion.span layoutId="avatar-type" className="absolute inset-0 rounded-md bg-gold-500" />}
                <span className="relative">{b.toLowerCase()}</span>
              </button>
            ))}
          </div>
          <Slider label="Height" unit="cm" min={avatar.body === "KIDS" ? 90 : 140} max={avatar.body === "KIDS" ? 165 : 210} value={avatar.heightCm} onChange={(v) => setAvatar({ ...avatar, heightCm: v })} />
          <Slider label="Weight" unit="kg" min={avatar.body === "KIDS" ? 14 : 40} max={avatar.body === "KIDS" ? 70 : 150} value={avatar.weightKg} onChange={(v) => setAvatar({ ...avatar, weightKg: v })} />
          <fieldset>
            <legend className="mb-2 text-sm text-white/80">Body shape</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["SLIM", "ATHLETIC", "REGULAR", "BROAD"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={avatar.shape === s} onClick={() => setAvatar({ ...avatar, shape: s })} className={cn("rounded-md border px-3 py-2 text-sm capitalize transition-colors", avatar.shape === s ? "border-gold-500 bg-gold-500/15 text-white" : "border-white/15 text-white/70 hover:border-white/40")}>
                  {s.toLowerCase()}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm text-white/80">Skin tone</legend>
            <div className="flex gap-2">
              {SKIN.map((c, i) => (
                <button key={c} type="button" aria-pressed={skin === c} aria-label={`Skin tone ${i + 1}`} onClick={() => setSkin(c)} className={cn("size-8 rounded-full ring-2 ring-offset-2 ring-offset-navy-800", skin === c ? "ring-gold-500" : "ring-transparent")} style={{ background: c }} />
              ))}
            </div>
          </fieldset>
          <dl className="grid grid-cols-3 gap-2 text-center text-xs">
            {(
              [
                ["Chest", body.chest],
                ["Waist", body.waist],
                ["Hips", body.hips],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-md bg-navy-900 p-2">
                <dt className="text-white/50">{k}</dt>
                <dd className="font-semibold">{Math.round(v)} cm</dd>
              </div>
            ))}
          </dl>
          <Button
            variant="outlineLight"
            className="w-full"
            loading={pending}
            onClick={() =>
              start(async () => {
                if (!signedIn) return void toast.error("Sign in to save your avatar", { action: { label: "Sign in", onClick: () => router.push("/login?next=/try-on") } });
                const res = await saveAvatar({ ...avatar, name: `${avatar.body.toLowerCase()} · ${avatar.heightCm}cm`, consent: true });
                if (!res.ok) toast.error(res.error);
                else toast.success(res.message);
              })
            }
          >
            <Save /> Save avatar to my account
          </Button>
          <p className="text-[11px] leading-relaxed text-white/50">Saving stores height, weight and shape privately on your account. You can delete it any time in Sizes & avatars.</p>
        </section>

        {/* Stage */}
        <section aria-label="3D preview" className="relative overflow-hidden rounded-[12px] ring-1 ring-white/10">
          <div className="h-[56dvh] min-h-[420px] lg:h-[calc(100dvh-10rem)]">
            <Scene heightCm={avatar.heightCm} body={body} skin={skin} garments={garments} fitMap={fitMap} spin={spin} />
          </div>
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setSpin(!spin)} aria-pressed={spin} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur hover:bg-white/20">
              <RotateCw className={cn("size-3.5", spin && "animate-spin [animation-duration:3s]")} aria-hidden /> 360° spin
            </button>
            <button type="button" onClick={() => setFitMap(!fitMap)} aria-pressed={fitMap} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur hover:bg-white/20">
              <Eye className="size-3.5" aria-hidden /> {fitMap ? "Fit map on" : "Fit map off"}
            </button>
          </div>
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-navy-900/80 px-4 py-2.5 text-xs backdrop-blur">
            <div className="flex gap-4" aria-label="Fit map legend">
              {(
                [
                  ["good", "Good fit"],
                  ["loose", "Slightly loose"],
                  ["tight", "Tight"],
                ] as const
              ).map(([k, l]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: FIT_COLORS[k] }} /> {l}
                </span>
              ))}
            </div>
            <span className="text-white/50">Drag to rotate · scroll to zoom</span>
          </div>
        </section>

        {/* Garments & fit */}
        <section aria-labelledby="look-h" className="space-y-5">
          <div className="rounded-[12px] bg-navy-800 p-5 ring-1 ring-white/10">
            <h2 id="look-h" className="font-display flex items-center gap-2 text-xl">
              <Layers className="size-5 text-gold-500" aria-hidden /> The look
            </h2>
            <ul className="mt-3 space-y-2">
              <AnimatePresence initial={false}>
                {worn.map((w) => (
                  <motion.li key={w.p.id} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                    <div className={cn("flex items-center gap-3 rounded-[8px] p-2", focus?.p.id === w.p.id ? "bg-white/10" : "")}>
                      <button type="button" onClick={() => setFocusId(w.p.id)} className="relative size-12 shrink-0 overflow-hidden rounded-md bg-white" aria-label={`Focus ${w.p.title}`}>
                        {w.p.image && <ProductImage src={w.p.image} alt="" sizes="48px" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{w.p.title}</p>
                        <p className="text-xs text-white/60">
                          {w.chosen ? `Size ${w.chosen}` : "One size"} · {formatPrice(w.p.price)}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${w.p.title} from the look`}
                        onClick={() => setLook((l) => Object.fromEntries(Object.entries(l).filter(([, v]) => v.productId !== w.p.id)))}
                        className="grid size-8 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {!worn.length && <p className="mt-2 text-sm text-white/60">Pick garments below to dress your avatar.</p>}
          </div>

          {focus && focus.chart && (
            <motion.div key={focus.p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-[12px] bg-navy-800 p-5 ring-1 ring-white/10">
              <p className="text-sm text-white/70">Size for {focus.p.title}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.keys(focus.chart).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={focus.chosen === s}
                    onClick={() => setLook((l) => ({ ...l, [slot(focus.p.kind)]: { productId: focus.p.id, size: s } }))}
                    className={cn("relative h-10 min-w-11 rounded-md border px-2 text-sm font-medium", focus.chosen === s ? "border-gold-500 bg-gold-500 text-navy-900" : "border-white/20 hover:border-white/50")}
                  >
                    {s}
                    {focus.rec === s && <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-emerald text-white" aria-label="Recommended"><Check className="size-3" /></span>}
                  </button>
                ))}
              </div>
              {focus.fit && (
                <>
                  <ul className="mt-4 space-y-1.5 text-sm">
                    {focus.fit.regions.map((r) => (
                      <li key={r.region} className="flex items-center justify-between">
                        <span className="capitalize">{r.region === "footLength" ? "Length" : r.region}</span>
                        <span className="flex items-center gap-2 text-xs">
                          <span className="text-white/50">{r.easeCm > 0 ? "+" : ""}{r.easeCm} cm</span>
                          <span className="rounded-full px-2 py-0.5 font-semibold" style={{ background: `${FIT_COLORS[r.level]}33`, color: r.level === "loose" ? "#E3CC8F" : r.level === "tight" ? "#F2A39E" : "#7FD3B0" }}>
                            {r.level === "good" ? "Good" : r.level === "loose" ? "Loose" : "Tight"}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 rounded-md bg-navy-900 p-3 text-sm" aria-live="polite">
                    {fitAdvice(focus.fit)} {focus.rec && focus.rec !== focus.chosen ? `We recommend ${focus.rec} for your measurements.` : ""}
                  </p>
                </>
              )}
              <Button
                variant="gold"
                className="mt-4 w-full"
                loading={pending}
                disabled={!focus.variant || !focus.variant.stock}
                onClick={() =>
                  start(async () => {
                    const res = await addToCart({ variantId: focus.variant!.id, quantity: 1 });
                    if (!res.ok) toast.error(res.error);
                    else toast.success(`Size ${focus.chosen} added to cart`, { action: { label: "View cart", onClick: () => router.push("/cart") } });
                  })
                }
              >
                <ShoppingBag /> Add size {focus.chosen} to Cart
              </Button>
              <Link href={`/p/${focus.p.slug}`} className="mt-2 block text-center text-xs text-white/60 underline hover:text-white">
                View product details
              </Link>
            </motion.div>
          )}

          <div className="rounded-[12px] bg-navy-800 p-5 ring-1 ring-white/10">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Camera className="size-4 text-gold-500" aria-hidden /> Try on your own photo
            </h3>
            <p className="mt-1 text-xs text-white/60">Your photo is processed for this preview only. It is never saved to our servers.</p>
            {!photo ? (
              <>
                <label className="mt-3 flex items-start gap-2 text-xs">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-gold-500" />
                  I consent to my photo being processed to create a private try-on preview.
                </label>
                <label className={cn("mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-white/25 px-3 py-4 text-sm", !consent && "pointer-events-none opacity-40")}>
                  <Upload className="size-4" aria-hidden /> Choose a photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={!consent}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 6_000_000) return void toast.error("Please use a photo under 6 MB.");
                      const reader = new FileReader();
                      reader.onload = () => setPhoto(reader.result as string);
                      reader.readAsDataURL(f);
                    }}
                  />
                </label>
              </>
            ) : (
              <div className="mt-3 space-y-2">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.url} alt="Try-on preview" className="w-full rounded-md" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="Your uploaded photo" className="max-h-48 w-full rounded-md object-cover" />
                )}
                {preview?.note && <p className="text-[11px] text-white/50">{preview.note}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="gold" size="sm" loading={pending} disabled={!focus} onClick={() => start(renderPhoto)}>
                    Generate preview
                  </Button>
                  <Button variant="outlineLight" size="sm" onClick={() => (setPhoto(null), setPreview(null), setConsent(false))}>
                    <Trash2 /> Delete photo
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <section aria-labelledby="garments-h" className="container-page pb-10">
        <h2 id="garments-h" className="font-display mb-3 text-xl">Add to the look</h2>
        <ul className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {products.map((p) => {
            const on = worn.some((w) => w.p.id === p.id);
            return (
              <li key={p.id} className="w-40 shrink-0">
                <button type="button" onClick={() => wear(p)} aria-pressed={on} className={cn("block w-full overflow-hidden rounded-[10px] bg-navy-800 text-left ring-1 transition-all hover:-translate-y-0.5", on ? "ring-gold-500" : "ring-white/10")}>
                  <span className="relative block aspect-square bg-white">{p.image && <ProductImage src={p.image} alt="" sizes="160px" />}</span>
                  <span className="block p-2.5">
                    <span className="line-clamp-2 text-xs font-medium">{p.title}</span>
                    <span className="mt-1 flex items-center justify-between text-xs text-white/60">
                      {formatPrice(p.price)}
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] capitalize">{p.kind.toLowerCase()}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function slot(kind: GarmentKind) {
  return kind === "TOP" ? "top" : kind === "BOTTOM" ? "bottom" : kind === "DRESS" ? "dress" : kind === "SHOES" ? "shoes" : "accessory";
}

function Slider({ label, unit, min, max, value, onChange }: { label: string; unit: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  const id = `slider-${label}`;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <label htmlFor={id} className="text-white/80">{label}</label>
        <span className="font-semibold tabular-nums">
          {value} {unit}
        </span>
      </div>
      <input id={id} type="range" min={min} max={max} value={Math.min(max, Math.max(min, value))} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-gold-500" />
    </div>
  );
}

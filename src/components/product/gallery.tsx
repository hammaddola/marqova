"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Box, Expand, PlayCircle, Shirt, Smartphone } from "lucide-react";
import { AnimatePresence, motion } from "@/components/motion";
import { ProductImage } from "@/components/brand";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ModelViewer = dynamic(() => import("./model-viewer").then((m) => m.ModelViewer), { ssr: false });

type Media = { id: string; type: "IMAGE" | "VIDEO" | "MODEL_3D"; url: string; alt: string; usdzUrl: string | null };

export function Gallery({ media, title, productId, tryOn }: { media: Media[]; title: string; productId: string; tryOn: boolean }) {
  const visual = media.filter((m) => m.type !== "MODEL_3D");
  const model = media.find((m) => m.type === "MODEL_3D");
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const current = visual[index];

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      <div className="flex gap-2 overflow-x-auto scrollbar-none md:w-16 md:flex-col" role="tablist" aria-label="Product images">
        {visual.map((m, i) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={i === index}
            aria-label={`Show image ${i + 1}`}
            onMouseEnter={() => setIndex(i)}
            onClick={() => setIndex(i)}
            className={cn("relative aspect-square w-16 shrink-0 overflow-hidden rounded-md border-2 bg-sand-50 transition-colors", i === index ? "border-gold-500" : "border-transparent hover:border-sand")}
          >
            {m.type === "VIDEO" ? <PlayCircle className="absolute inset-0 m-auto size-6 text-navy-900" /> : <ProductImage src={m.url} alt="" sizes="64px" />}
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="relative aspect-square cursor-zoom-in overflow-hidden rounded-[8px] border border-sand bg-sand-50"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={current?.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {current?.type === "VIDEO" ? (
                <video src={current.url} controls className="h-full w-full object-contain" aria-label={current.alt} />
              ) : current ? (
                <div className="absolute inset-0 transition-transform duration-200" style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}>
                  <ProductImage src={current.url} alt={current.alt} priority sizes="(min-width: 1024px) 45vw, 100vw" />
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
          <Dialog>
            <DialogTrigger asChild>
              <button className="absolute right-3 bottom-3 grid size-10 place-items-center rounded-full bg-white/95 shadow" aria-label="Open full-screen image">
                <Expand className="size-4" />
              </button>
            </DialogTrigger>
            <DialogContent title={title} wide>
              <div className="relative aspect-square w-full overflow-hidden rounded-md bg-sand-50">{current && current.type !== "VIDEO" && <ProductImage src={current.url} alt={current.alt} sizes="90vw" className="object-contain" />}</div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {model ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="navy">
                  <Box /> View in 3D
                </Button>
              </DialogTrigger>
              <DialogContent title="View in 3D" description="Drag to rotate, pinch or scroll to zoom. On a phone, tap the AR icon to place it in your room." wide>
                <div className="h-[60dvh] overflow-hidden rounded-md">
                  <ModelViewer src={model.url} iosSrc={model.usdzUrl} alt={`3D model of ${title}`} className="h-full w-full" />
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs text-slate">
                  <Smartphone className="size-4" aria-hidden /> AR works on Android (Scene Viewer) and iOS (Quick Look when a USDZ file is provided).
                </p>
              </DialogContent>
            </Dialog>
          ) : (
            <Button variant="secondary" disabled title="The seller hasn't added a 3D model yet">
              <Box /> 3D not available
            </Button>
          )}
          {tryOn ? (
            <Button asChild variant="gold">
              <Link href={`/try-on?product=${productId}`}>
                <Shirt /> Try it on me
              </Link>
            </Button>
          ) : (
            <Button variant="secondary" disabled>
              <Shirt /> Try-on n/a
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Box, ShieldCheck, Ruler, Star } from "lucide-react";
import { motion } from "@/components/motion";

const float = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: [0, -8, 0] },
  transition: { opacity: { duration: 0.6, delay }, y: { duration: 6, repeat: Infinity, ease: "easeInOut" as const, delay } },
});

/** Decorative hero composition: a product card with the trust and fit signals that set Marqova apart. */
export function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-[4/3.4] w-full max-w-md" aria-hidden>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: -2 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-8 top-4 bottom-10 overflow-hidden rounded-[16px] bg-white shadow-2xl"
      >
        <div className="relative h-[62%] bg-[linear-gradient(135deg,#F3F0E9,#E6E1D6)]">
          <svg viewBox="0 0 800 800" className="absolute inset-0 m-auto h-full w-full p-8">
            <path d="M290 230 L350 196 Q400 236 450 196 L510 230 L590 310 L536 362 L500 330 L500 610 L300 610 L300 330 L264 362 L210 310 Z" fill="#1C2A40" />
            <path d="M350 196 Q400 270 450 196" fill="none" stroke="#C8A24A" strokeWidth="6" />
          </svg>
          <span className="absolute top-3 left-3 flex items-center gap-1 rounded bg-navy-900 px-2 py-1 text-[11px] font-semibold text-white">
            <Box className="size-3" /> View in 3D
          </span>
        </div>
        <div className="space-y-2 p-5 text-ink">
          <div className="h-3 w-3/4 rounded bg-sand" />
          <div className="flex items-center gap-1 text-gold-600">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="size-3.5" fill="currentColor" strokeWidth={0} />
            ))}
            <span className="ml-1 text-xs text-slate">Verified buyers</span>
          </div>
          <p className="text-xl font-semibold">Rs 4,990</p>
          <p className="text-xs font-semibold text-emerald">FREE delivery · Thu, 5 Nov</p>
        </div>
      </motion.div>

      <motion.div {...float(0.4)} className="absolute top-10 -right-2 flex items-center gap-2 rounded-full bg-emerald px-3 py-2 text-xs font-semibold text-white shadow-lg sm:-right-6">
        <ShieldCheck className="size-4" /> Trust Score 94
      </motion.div>
      <motion.div {...float(0.8)} className="absolute top-[38%] -left-2 rounded-[10px] bg-white p-3 text-xs text-ink shadow-lg sm:-left-10">
        <p className="flex items-center gap-1.5 font-semibold">
          <Ruler className="size-3.5 text-gold-text" /> Recommended size: M
        </p>
        <div className="mt-2 flex gap-1.5">
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald">Chest · good</span>
          <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-semibold text-gold-text">Waist · roomy</span>
        </div>
      </motion.div>
      <motion.div {...float(1.2)} className="absolute right-4 bottom-0 rounded-[10px] bg-navy-700 px-3 py-2 text-xs text-white shadow-lg">
        Total incl. delivery <span className="font-semibold text-gold-500">Rs 4,990</span>
      </motion.div>
    </div>
  );
}

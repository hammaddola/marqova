import Link from "next/link";
import Image from "next/image";
import { Star, ShieldCheck } from "lucide-react";
import { cn, formatPrice, percentOff } from "@/lib/utils";

/** Wordmark: "Marqova" in Playfair Display with a Heritage Gold "o". */
export function Logo({ dark = false, className, href = "/" }: { dark?: boolean; className?: string; href?: string | null }) {
  const mark = (
    <span className={cn("font-display text-[26px] leading-none font-semibold tracking-tight", dark ? "text-white" : "text-navy-900", className)}>
      Marq<span className="text-gold-500">o</span>va
    </span>
  );
  if (!href) return mark;
  return (
    <Link href={href} aria-label="Marqova home" className={cn("inline-flex items-center rounded", dark && "focus-dark")}>
      {mark}
    </Link>
  );
}

export function Stars({ value, size = 14, className, showValue }: { value: number; size?: number; className?: string; showValue?: boolean }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value.toFixed(1)} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = rounded >= i ? 1 : rounded >= i - 0.5 ? 0.5 : 0;
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }} aria-hidden>
            <Star className="absolute inset-0 text-sand" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className="text-gold-600" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
              </span>
            )}
          </span>
        );
      })}
      {showValue && <span className="ml-1 text-sm font-semibold text-ink">{value.toFixed(1)}</span>}
    </span>
  );
}

export function Price({ value, compareAt, size = "md", className }: { value: number; compareAt?: number | null; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const off = percentOff(value, compareAt);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      {off > 0 && <span className={cn("font-semibold text-crimson", size === "xl" ? "text-xl" : "text-sm")}>-{off}%</span>}
      <span className={cn("font-semibold tabular-nums text-ink", { sm: "text-base", md: "text-lg", lg: "text-2xl", xl: "text-[32px] leading-tight" }[size])}>{formatPrice(value)}</span>
      {off > 0 && compareAt && (
        <span className="text-sm text-slate line-through tabular-nums">
          <span className="sr-only">Was </span>
          {formatPrice(compareAt)}
        </span>
      )}
    </div>
  );
}

export function TrustPill({ score, className }: { score: number; className?: string }) {
  const tone = score >= 85 ? "bg-emerald text-white" : score >= 70 ? "bg-emerald-50 text-emerald" : "bg-sand-50 text-slate";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", tone, className)}>
      <ShieldCheck className="size-3" aria-hidden />
      Trust {score}
    </span>
  );
}

/** Product imagery. Sample SVG artwork is served unoptimised; real uploads go through next/image. */
export function ProductImage({ src, alt, className, sizes, priority, fill = true }: { src: string; alt: string; className?: string; sizes?: string; priority?: boolean; fill?: boolean }) {
  const unoptimized = src.startsWith("/sample/") || src.startsWith("data:") || src.endsWith(".svg");
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={fill ? undefined : 600}
      height={fill ? undefined : 600}
      sizes={sizes ?? "(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"}
      className={cn("object-cover", className)}
      priority={priority}
      unoptimized={unoptimized}
    />
  );
}

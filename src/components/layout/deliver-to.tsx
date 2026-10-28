"use client";

import { useTransition } from "react";
import { Popover } from "radix-ui";
import { MapPin, Check } from "lucide-react";
import { setDeliveryCity } from "@/server/actions/preferences";
import { cn } from "@/lib/utils";
import { CITIES } from "@/lib/pakistan";


export function DeliverTo({ city, className }: { city: string; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <Popover.Root>
      <Popover.Trigger className={cn("focus-dark flex items-center gap-1 rounded-md px-2 py-1 text-left leading-tight hover:bg-white/10", className)}>
        <MapPin className="size-4 text-gold-500" aria-hidden />
        <span className="flex flex-col">
          <span className="text-[11px] text-white/70">Deliver to</span>
          <span className="text-sm font-semibold">{pending ? "Updating…" : city}</span>
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={8} align="start" className="z-50 w-72 rounded-[8px] border border-sand bg-white p-4 shadow-[var(--shadow-lift)]">
          <p className="heading-display text-lg">Choose your location</p>
          <p className="mt-1 mb-3 text-xs text-slate">Delivery dates and fees update for your city.</p>
          <div className="grid grid-cols-2 gap-1.5">
            {CITIES.map((c) => (
              <Popover.Close key={c} asChild>
                <button
                  onClick={() => start(() => setDeliveryCity(c))}
                  className={cn("flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors", c === city ? "border-navy-900 bg-navy-900 text-white" : "border-sand hover:border-slate/40")}
                >
                  {c}
                  {c === city && <Check className="size-3.5" aria-hidden />}
                </button>
              </Popover.Close>
            ))}
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

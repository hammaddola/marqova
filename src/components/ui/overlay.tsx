"use client";

import { Dialog as D, HoverCard as HC, Tabs as T, Tooltip as TT } from "radix-ui";
import { Drawer as V } from "vaul";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Dialog ──
export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({ title, description, children, className, wide }: { title: string; description?: string; children: React.ReactNode; className?: string; wide?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-navy-900/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in" />
      <D.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[12px] bg-white p-6 shadow-[var(--shadow-lift)] focus:outline-none",
          wide ? "max-w-4xl" : "max-w-lg",
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <D.Title className="heading-display text-xl">{title}</D.Title>
            {description ? <D.Description className="mt-1 text-sm text-slate">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close className="grid size-9 shrink-0 place-items-center rounded-full text-slate hover:bg-sand-50" aria-label="Close">
            <X className="size-4" />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}

// ── Drawer (vaul): bottom sheet on mobile, side panel on desktop ──
export const Drawer = V.Root;
export const DrawerTrigger = V.Trigger;
export const DrawerClose = V.Close;

export function DrawerContent({ title, children, side = "bottom", className }: { title: string; children: React.ReactNode; side?: "bottom" | "right" | "left"; className?: string }) {
  return (
    <V.Portal>
      <V.Overlay className="fixed inset-0 z-50 bg-navy-900/50" />
      <V.Content
        className={cn(
          "fixed z-50 flex flex-col bg-white focus:outline-none",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[16px]",
          side === "right" && "inset-y-0 right-0 w-[min(420px,92vw)]",
          side === "left" && "inset-y-0 left-0 w-[min(360px,88vw)]",
          className,
        )}
      >
        {side === "bottom" && <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-sand" aria-hidden />}
        <div className="flex items-center justify-between border-b border-sand px-5 py-4">
          <V.Title className="heading-display text-lg">{title}</V.Title>
          <V.Description className="sr-only">{title}</V.Description>
          <V.Close className="grid size-9 place-items-center rounded-full text-slate hover:bg-sand-50" aria-label="Close">
            <X className="size-4" />
          </V.Close>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </V.Content>
    </V.Portal>
  );
}

// ── Tabs ──
export const Tabs = T.Root;
export const TabsContent = T.Content;

export function TabsList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return <T.List className={cn("flex gap-1 overflow-x-auto border-b border-sand scrollbar-none", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "relative -mb-px shrink-0 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate transition-colors hover:text-ink data-[state=active]:border-gold-500 data-[state=active]:text-ink",
        className,
      )}
      {...props}
    />
  );
}

// ── Hover card & tooltip ──
export function HoverInfo({ trigger, children, className }: { trigger: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <HC.Root openDelay={120} closeDelay={80}>
      <HC.Trigger asChild>{trigger}</HC.Trigger>
      <HC.Portal>
        <HC.Content sideOffset={8} className={cn("z-50 w-72 rounded-[8px] border border-sand bg-white p-4 text-sm shadow-[var(--shadow-lift)]", className)}>
          {children}
          <HC.Arrow className="fill-white" />
        </HC.Content>
      </HC.Portal>
    </HC.Root>
  );
}

export function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TT.Provider delayDuration={200}>
      <TT.Root>
        <TT.Trigger asChild>{children}</TT.Trigger>
        <TT.Portal>
          <TT.Content sideOffset={6} className="z-50 rounded-md bg-navy-900 px-2.5 py-1.5 text-xs text-white shadow">
            {label}
            <TT.Arrow className="fill-navy-900" />
          </TT.Content>
        </TT.Portal>
      </TT.Root>
    </TT.Provider>
  );
}

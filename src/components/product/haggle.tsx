"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Handshake, LogOut, Send } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { usePurchase } from "@/components/product/purchase";
import { addToCart } from "@/server/actions/cart";
import { haggle, type HaggleView } from "@/server/actions/haggle";
import { cn, formatPrice } from "@/lib/utils";

type Msg = { from: "seller" | "me"; text: string };

const LINES: Record<HaggleView["kind"], ((p: string) => string)[]> = {
  open: [(p) => `Assalam-o-alaikum! I'm asking ${p}. Make me a fair offer.`],
  counter: [
    (p) => `Itna kam? Quality dekhiye! I can do ${p}.`,
    (p) => `Aap ke liye special: ${p}.`,
    (p) => `Bhai, mera bhi ghar chalana hai. ${p}.`,
    (p) => `Chalo, thora aur kam: ${p}.`,
  ],
  insulted: [(p) => `Arre bhai! At that price I'd be paying you. Still ${p}.`, (p) => `Mazaak na karein! ${p}, a serious offer please.`],
  final: [(p) => `Bas, aakhri baat: ${p}. Take it or leave it.`],
  callback: [(p) => `Acha acha, ruko! Don't go. ${p}, only for you.`],
  deal: [(p) => `Pakka! Done at ${p}. Mubarak ho!`],
  gone: [() => `Theek hai, Allah Hafiz. Come back tomorrow!`],
};

const say = (v: HaggleView) => {
  const pool = LINES[v.kind];
  return pool[v.rounds % pool.length](formatPrice(v.deal ?? v.ask));
};

/** Bhao-Taao: bargain with the seller, bazaar style. The server holds the seller's limit. */
export function Haggle({ productId, slug, storeName, signedIn }: { productId: string; slug: string; storeName: string; signedIn: boolean }) {
  const router = useRouter();
  const { variant } = usePurchase();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<HaggleView | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [offer, setOffer] = useState("");
  const [lastOffer, setLastOffer] = useState<number | null>(null);
  const [typing, setTyping] = useState(false);
  const [pending, start] = useTransition();
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  const move = (m: Parameters<typeof haggle>[1], mine?: string) =>
    start(async () => {
      if (mine) setMsgs((x) => [...x, { from: "me", text: mine }]);
      setTyping(true);
      // A short pause so the seller "thinks" before answering.
      const [res] = await Promise.all([haggle(productId, m), new Promise((r) => setTimeout(r, m.type === "open" ? 300 : 900))]);
      setTyping(false);
      if (!res.ok) return void toast.error(res.error);
      setView(res.data!);
      setMsgs((x) => [...x, { from: "seller", text: say(res.data!) }]);
    });

  const onOpen = (o: boolean) => {
    setOpen(o);
    // The server forgets a walked-away haggle, so reopening starts afresh.
    if (o && (!view || view.kind === "gone")) {
      setMsgs([]);
      setLastOffer(null);
      move({ type: "open" });
    }
  };

  const sendOffer = (rupees: number) => {
    if (!rupees || pending) return;
    setLastOffer(rupees * 100);
    setOffer("");
    move({ type: "offer", rupees }, `How about ${formatPrice(rupees * 100)}?`);
  };

  const buy = () =>
    start(async () => {
      if (!variant) return;
      const res = await addToCart({ variantId: variant.id, quantity: 1 });
      if (!res.ok) return void toast.error(res.error);
      router.push("/cart");
    });

  if (!signedIn)
    return (
      <Link href={`/login?next=/p/${slug}`} className="group flex items-center gap-3 rounded-[8px] border border-dashed border-gold-500/60 bg-gold-100/40 p-4 text-sm hover:border-gold-500">
        <Handshake className="size-6 shrink-0 text-gold-text" aria-hidden />
        <span>
          <span className="block font-semibold">Bhao-Taao: make an offer</span>
          <span className="text-xs text-slate">This seller bargains. Sign in to haggle.</span>
        </span>
      </Link>
    );

  const done = view?.kind === "deal" || view?.kind === "gone";
  const ask = view?.ask ?? 0;
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / (view?.price || 1)) * 100))}%`;

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild>
        <button type="button" className="group relative flex w-full items-center gap-3 overflow-hidden rounded-[8px] bg-navy-900 p-4 text-left text-sm text-white transition-transform hover:-translate-y-0.5">
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_100%_0%,rgba(200,162,74,0.35),transparent_60%)]" />
          <motion.span aria-hidden className="relative grid size-10 shrink-0 place-items-center rounded-full bg-gold-500 text-navy-900" animate={{ rotate: [0, -12, 12, -6, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3 }}>
            <Handshake className="size-5" />
          </motion.span>
          <span className="relative">
            <span className="block font-semibold">Bhao-Taao: make an offer</span>
            <span className="text-xs text-white/70">Bargain with {storeName}, bazaar style</span>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent title="Bhao-Taao" description={`Haggle with ${storeName}. Every deal is honoured at checkout.`}>
        {view && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate">
              <span>Their ask <strong className="text-ink">{formatPrice(ask)}</strong></span>
              <span className="flex gap-1" aria-label={`Round ${view.rounds} of ${view.maxRounds}`}>
                {Array.from({ length: view.maxRounds }, (_, i) => (
                  <span key={i} className={cn("size-2 rounded-full", i < view.rounds ? "bg-gold-500" : "bg-sand")} />
                ))}
              </span>
            </div>
            {/* Tug of war: the gap between your offer and their ask */}
            <div className="relative mt-2 h-2.5 rounded-full bg-sand-50 ring-1 ring-sand" aria-hidden>
              {lastOffer != null && (
                <motion.div className="absolute inset-y-0 rounded-full bg-gradient-to-r from-gold-300 to-gold-500" initial={false} animate={{ left: pct(Math.min(lastOffer, ask)), right: `calc(100% - ${pct(ask)})` }} />
              )}
              <motion.span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-navy-900 shadow" initial={false} animate={{ left: pct(ask) }} />
              {lastOffer != null && <motion.span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gold-500 shadow" initial={false} animate={{ left: pct(lastOffer) }} />}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate">
              <span>{lastOffer != null ? `You: ${formatPrice(lastOffer)}` : "Your offer"}</span>
              <span>List price {formatPrice(view.price)}</span>
            </div>
          </div>
        )}

        <ol ref={logRef} role="log" aria-live="polite" className="max-h-72 min-h-40 space-y-2 overflow-y-auto rounded-[8px] bg-sand-50 p-3">
          <AnimatePresence initial={false}>
            {msgs.map((m, i) => (
              <motion.li key={i} initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={cn("flex", m.from === "me" && "justify-end")}>
                <span className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", m.from === "me" ? "rounded-br-sm bg-navy-900 text-white" : "rounded-bl-sm bg-white ring-1 ring-sand")}>
                  {m.from === "seller" && <span className="mb-0.5 block text-[11px] font-semibold text-gold-text">{storeName}</span>}
                  {m.text}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
          {typing && (
            <li className="flex" aria-label={`${storeName} is typing`}>
              <span className="flex gap-1 rounded-2xl rounded-bl-sm bg-white px-3.5 py-3 ring-1 ring-sand">
                {[0, 1, 2].map((d) => (
                  <motion.span key={d} className="size-1.5 rounded-full bg-slate" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: d * 0.15 }} />
                ))}
              </span>
            </li>
          )}
        </ol>

        {view?.kind === "deal" && view.deal != null && (
          <div className="relative mt-4 overflow-hidden rounded-[8px] border border-emerald/40 bg-emerald/5 p-4 text-center">
            <motion.p
              initial={{ scale: 2.4, rotate: -24, opacity: 0 }}
              animate={{ scale: 1, rotate: -8, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 14 }}
              className="mx-auto inline-block rounded-[6px] border-[3px] border-crimson px-3 py-1 font-display text-2xl font-bold tracking-widest text-crimson"
            >
              PAKKA DEAL
            </motion.p>
            <p className="mt-3 text-sm">
              {formatPrice(view.deal)} <span className="text-slate line-through">{formatPrice(view.price)}</span>
            </p>
            {view.couponCode && (
              <p className="mt-1 text-xs text-slate">
                Code <strong className="font-mono text-ink">{view.couponCode}</strong> is in your cart for 2 hours. It covers one of this item.
              </p>
            )}
            <Button variant="gold" className="mt-3 w-full" onClick={buy} disabled={pending || !variant}>
              Add to cart at my price
            </Button>
          </div>
        )}

        {view && !done && (
          <div className="mt-4 space-y-3">
            {!view.final && (
              <>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15].map((off) => {
                    const r = Math.floor((ask * (100 - off)) / 100 / 100 / 10) * 10;
                    return (
                      <button key={off} type="button" disabled={pending} onClick={() => sendOffer(r)} className="rounded-full border border-sand bg-white px-3 py-1.5 text-xs font-medium hover:border-gold-500 disabled:opacity-50">
                        {formatPrice(r * 100)} <span className="text-slate">(−{off}%)</span>
                      </button>
                    );
                  })}
                </div>
                <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), sendOffer(Number(offer)))}>
                  <label htmlFor="haggle-offer" className="sr-only">Your offer in rupees</label>
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate">Rs</span>
                    <input id="haggle-offer" inputMode="numeric" value={offer} onChange={(e) => setOffer(e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="Your offer" className="h-11 w-full rounded-[8px] border border-sand bg-white pr-3 pl-10 text-sm focus:border-navy-900 focus:outline-none" />
                  </div>
                  <Button type="submit" variant="navy" disabled={pending || !offer} aria-label="Send offer">
                    <Send />
                  </Button>
                </form>
              </>
            )}
            <div className="flex gap-2">
              <Button variant="gold" className="flex-1" disabled={pending} onClick={() => move({ type: "accept" }, `Theek hai, ${formatPrice(ask)}. Deal!`)}>
                <Handshake /> Deal at {formatPrice(ask)}
              </Button>
              <Button variant="secondary" disabled={pending} onClick={() => move({ type: "walk" }, "Rehne dein, I'll look elsewhere.")}>
                <LogOut /> Walk away
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

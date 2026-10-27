"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Search, Loader2, Clock, TrendingUp, ImageUp } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "@/components/motion";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Suggestion = { title: string; slug: string };
const RECENT_KEY = "mq_recent_searches";
const TRENDING = ["linen shirt", "wireless earbuds", "sofa", "sunscreen", "sneakers", "basmati rice"];

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function SearchBar({ categories }: { categories: { name: string; slug: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [cat, setCat] = useState(params.get("category") ?? "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) setItems((await res.json()).items);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const showingQuery = q.trim().length >= 2;
  const options: { label: string; href: string; kind: "product" | "recent" | "trending" }[] = showingQuery
    ? items.filter(() => q.trim().length >= 2).map((i) => ({ label: i.title, href: `/p/${i.slug}`, kind: "product" as const }))
    : [
        ...recent.slice(0, 5).map((r) => ({ label: r, href: `/search?q=${encodeURIComponent(r)}`, kind: "recent" as const })),
        ...TRENDING.map((r) => ({ label: r, href: `/search?q=${encodeURIComponent(r)}`, kind: "trending" as const })),
      ];

  function go(term: string) {
    const t = term.trim();
    if (t) {
      const next = [t, ...readRecent().filter((r) => r !== t)].slice(0, 8);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
    }
    const sp = new URLSearchParams();
    if (t) sp.set("q", t);
    if (cat) sp.set("category", cat);
    setOpen(false);
    router.push(`/search?${sp.toString()}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) setOpen(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Enter" && active >= 0 && options[active]) {
      e.preventDefault();
      setOpen(false);
      router.push(options[active].href);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="flex h-11 overflow-hidden rounded-[8px] bg-white ring-gold-500 focus-within:ring-2"
      >
        <label htmlFor={`${listId}-cat`} className="sr-only">
          Search in category
        </label>
        <select
          id={`${listId}-cat`}
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="hidden max-w-36 cursor-pointer border-r border-sand bg-sand-50 px-3 text-xs font-medium text-ink focus:outline-none sm:block"
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => {
            setRecent(readRecent());
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search Marqova — try “navy linen shirt under 5000”"
          aria-label="Search products"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className="min-w-0 flex-1 px-3 text-sm text-ink placeholder:text-slate/70 focus:outline-none"
        />
        <PhotoSearch />
        <button type="submit" className="grid w-12 place-items-center bg-gold-500 text-navy-900 transition-colors hover:bg-gold-600 hover:text-white" aria-label="Search">
          {loading ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
        </button>
      </form>

      <AnimatePresence>
        {open && options.length > 0 && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-96 overflow-y-auto rounded-[8px] border border-sand bg-white py-2 text-ink shadow-[var(--shadow-lift)]"
          >
            {!showingQuery && recent.length > 0 && <li className="px-4 pt-1 pb-1 text-[11px] font-semibold tracking-wide text-slate uppercase">Recent</li>}
            {options.map((o, i) => (
              <li key={`${o.kind}-${o.label}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                {!showingQuery && o.kind === "trending" && (i === 0 || options[i - 1].kind !== "trending") && (
                  <span className="block px-4 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-slate uppercase">Trending</span>
                )}
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => {
                    setOpen(false);
                    router.push(o.href);
                  }}
                  className={cn("flex w-full items-center gap-3 px-4 py-2 text-left text-sm", i === active && "bg-sand-50")}
                >
                  {o.kind === "product" ? <Search className="size-4 text-slate" /> : o.kind === "recent" ? <Clock className="size-4 text-slate" /> : <TrendingUp className="size-4 text-gold-text" />}
                  <span className="truncate">{o.label}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function PhotoSearch() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  function onFile(file: File | undefined) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    start(async () => {
      const fd = new FormData();
      fd.set("photo", file);
      const res = await fetch("/api/search/photo", { method: "POST", body: fd });
      if (!res.ok) {
        toast.error("We couldn't read that photo. Try a JPG or PNG under 15 MB.");
        return;
      }
      const { href, color } = (await res.json()) as { href: string; color: string };
      toast.success(`Showing ${color.toLowerCase()} items similar to your photo`);
      setOpen(false);
      router.push(href);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="grid w-11 place-items-center text-slate transition-colors hover:text-navy-900" aria-label="Search by photo">
          <Camera className="size-5" />
        </button>
      </DialogTrigger>
      <DialogContent title="Search by photo" description="Upload a photo and we'll find items with a similar look and colour. The photo is analysed and then discarded.">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[8px] border-2 border-dashed border-sand bg-sand-50 p-8 text-center transition-colors hover:border-gold-500">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your photo" className="max-h-48 rounded-md object-contain" />
          ) : (
            <ImageUp className="size-10 text-gold-text" aria-hidden />
          )}
          <span className="text-sm font-medium">{pending ? "Analysing photo…" : "Choose a photo or drag it here"}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <Button variant="secondary" className="mt-4 w-full" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}

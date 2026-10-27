import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/server/session";
import { moderateListing } from "@/server/actions/admin";
import { counterfeitFlags, median } from "@/lib/moderation";
import { PageHeader } from "@/components/layout/console-shell";
import { ActionButton } from "@/components/ui/action-button";
import { StatusPill } from "@/components/account/status-pill";
import { ProductImage } from "@/components/brand";
import { EmptyState } from "@/components/ui/primitives";
import { formatPrice, cn } from "@/lib/utils";

export const metadata = { title: "Listing moderation" };

export default async function AdminListingsPage({ searchParams }: PageProps<"/admin/listings">) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const view = sp.view === "all" ? "all" : sp.view === "attention" ? "attention" : "flagged";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const rows = await db.product.findMany({
    where: {
      ...(view === "attention" ? { status: { in: ["NEEDS_ATTENTION", "REJECTED"] } } : { status: { not: "DRAFT" } }),
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: view === "flagged" ? 400 : 60,
    select: { id: true, slug: true, title: true, description: true, brand: true, basePrice: true, status: true, categoryId: true, moderationNote: true, store: { select: { name: true } }, media: { where: { type: "IMAGE" }, take: 1, select: { url: true } } },
  });
  const prices = await db.product.groupBy({ by: ["categoryId"], where: { status: "ACTIVE" }, _avg: { basePrice: true } });
  const catPrices = new Map<string, number[]>();
  for (const r of rows) catPrices.set(r.categoryId, [...(catPrices.get(r.categoryId) ?? []), r.basePrice]);
  const medianOf = (id: string) => median(catPrices.get(id) ?? []) ?? prices.find((p) => p.categoryId === id)?._avg.basePrice ?? null;
  const withFlags = rows.map((r) => ({ ...r, flags: counterfeitFlags({ title: r.title, description: r.description, brand: r.brand, price: r.basePrice }, medianOf(r.categoryId)) }));
  const shown = (view === "flagged" ? withFlags.filter((r) => r.flags.length) : withFlags).slice(0, 60);

  return (
    <div>
      <PageHeader title="Listing moderation" subtitle="AI-assisted counterfeit flags: replica wording, protected brand mismatch and implausibly low prices. A human makes the call." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-2 text-sm" aria-label="View">
          {[["flagged", "Flagged"], ["attention", "Needs attention"], ["all", "All live"]].map(([k, l]) => (
            <Link key={k} href={`/admin/listings?view=${k}`} aria-current={view === k ? "page" : undefined} className={cn("rounded-full px-3 py-1.5", view === k ? "bg-navy-900 text-white" : "bg-white ring-1 ring-sand")}>{l}</Link>
          ))}
        </nav>
        <form className="flex gap-2">
          <input type="hidden" name="view" value={view} />
          <label htmlFor="mq" className="sr-only">Search</label>
          <input id="mq" name="q" defaultValue={q} placeholder="Search titles" className="h-9 rounded-md border border-sand bg-white px-3 text-sm" />
        </form>
      </div>
      {!shown.length && <EmptyState title="Queue is clear" body="No listings match this view." />}
      <ul className="space-y-3">
        {shown.map((r) => (
          <li key={r.id} className="flex gap-4 rounded-[8px] border border-sand bg-white p-4 text-sm">
            <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-sand-50">{r.media[0] && <ProductImage src={r.media[0].url} alt="" sizes="64px" />}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/p/${r.slug}`} target="_blank" className="font-medium hover:text-gold-text">{r.title}</Link>
                <StatusPill status={r.status} />
              </div>
              <p className="text-xs text-slate">{r.store.name} · {r.brand ?? "no brand"} · {formatPrice(r.basePrice)}</p>
              {r.flags.map((f) => (
                <p key={f.code} className="mt-1 flex items-center gap-1 text-xs font-medium text-crimson"><AlertTriangle className="size-3.5" aria-hidden /> {f.detail}</p>
              ))}
              {r.moderationNote && <p className="mt-1 text-xs text-slate">Note: {r.moderationNote}</p>}
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              {r.status !== "ACTIVE" && <ActionButton size="sm" variant="gold" action={moderateListing.bind(null, r.id, "ACTIVE", undefined)}>Approve</ActionButton>}
              {r.status !== "REJECTED" && <ActionButton size="sm" variant="danger" confirm="Remove this listing from the store?" action={moderateListing.bind(null, r.id, "REJECTED", r.flags[0]?.detail ?? "Does not meet listing policy")}>Remove</ActionButton>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

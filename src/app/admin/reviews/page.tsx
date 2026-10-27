import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/server/session";
import { moderateReview } from "@/server/actions/admin";
import { PageHeader } from "@/components/layout/console-shell";
import { ActionButton } from "@/components/ui/action-button";
import { Stars } from "@/components/brand";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Review moderation" };

const FLAG_LABEL: Record<string, string> = { REVIEW_BURST: "Burst of reviews in 24h", DUPLICATE_TEXT: "Text copied from another review", LOW_EFFORT: "Very short" };

export default async function AdminReviewsPage() {
  await requireRole(["ADMIN"]);
  const reviews = await db.review.findMany({
    where: { status: { in: ["FLAGGED", "PENDING"] } },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { user: { select: { name: true, email: true, createdAt: true } }, product: { select: { title: true, slug: true } }, orderItem: { select: { id: true } } },
  });
  return (
    <div>
      <PageHeader title="Review moderation" subtitle="Reviews held by the burst and duplicate-text detectors. Only verified buyers can review at all." />
      {!reviews.length && <EmptyState title="No reviews waiting" body="Flagged reviews appear here." />}
      <ul className="space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-[8px] border border-sand bg-white p-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Stars value={r.rating} />
              <span className="font-semibold">{r.title}</span>
              {r.flags.map((f) => <Badge key={f} tone="crimson">{FLAG_LABEL[f] ?? f}</Badge>)}
              {r.orderItem ? <Badge tone="emerald">Verified purchase</Badge> : <Badge tone="outline">No linked order</Badge>}
            </div>
            <p className="mt-2">{r.body}</p>
            <p className="mt-2 text-xs text-slate">
              {r.user.name} ({r.user.email}, joined {formatDate(r.user.createdAt)}) on <Link href={`/p/${r.product.slug}`} className="underline">{r.product.title}</Link> · {formatDate(r.createdAt)}
            </p>
            <div className="mt-3 flex gap-2">
              <ActionButton size="sm" variant="gold" action={moderateReview.bind(null, r.id, "PUBLISHED")}>Publish</ActionButton>
              <ActionButton size="sm" variant="danger" action={moderateReview.bind(null, r.id, "REJECTED")}>Remove</ActionButton>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

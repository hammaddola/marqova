import "server-only";
import { db } from "@/lib/db";
import { PriorityQueue } from "@/lib/priority-queue";
import { computeTrustScore } from "@/lib/trust-score";
import { layoutEmail, sendEmail } from "@/lib/providers/email";
import { formatPrice, siteUrl } from "@/lib/utils";
import { buildSearchDocuments, getSearchAdapter } from "./search";
import type { Job } from "@/generated/prisma/client";

/**
 * Durable priority job queue backed by PostgreSQL.
 * Priority: 0 = critical (payments/emails), 5 = normal, 9 = background.
 * Workers claim jobs with FOR UPDATE SKIP LOCKED, so several can run in parallel.
 */
export const PRIORITY = { critical: 0, high: 2, normal: 5, low: 9 } as const;

export type JobType = "email.send" | "bulk.import" | "search.index" | "search.remove" | "price-alerts.check" | "trust.recompute";

export async function enqueue(type: JobType, payload: Record<string, unknown>, opts: { priority?: number; runAt?: Date; maxAttempts?: number } = {}) {
  return db.job.create({
    data: { type, payload: payload as object, priority: opts.priority ?? PRIORITY.normal, runAt: opts.runAt ?? new Date(), maxAttempts: opts.maxAttempts ?? 3 },
  });
}

async function claim(limit: number): Promise<Job[]> {
  // Re-queue jobs whose worker died (locked > 10 minutes).
  await db.$executeRaw`UPDATE "Job" SET status = 'QUEUED', "lockedAt" = NULL WHERE status = 'RUNNING' AND "lockedAt" < now() - interval '10 minutes'`;
  return db.$queryRaw<Job[]>`
    UPDATE "Job" SET status = 'RUNNING', "lockedAt" = now(), attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM "Job"
      WHERE status = 'QUEUED' AND "runAt" <= now()
      ORDER BY priority ASC, "runAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *`;
}

type Handler = (payload: Record<string, unknown>) => Promise<unknown>;

const handlers: Record<JobType, Handler> = {
  "email.send": async (p) => sendEmail(p as { to: string; subject: string; html: string }),
  "bulk.import": async (p) => (await import("./bulk")).processBulkUpload(p.uploadId as string),
  "search.index": async (p) => {
    const docs = await buildSearchDocuments({ id: { in: p.productIds as string[] }, status: "ACTIVE" });
    await getSearchAdapter().index(docs);
    return { indexed: docs.length };
  },
  "search.remove": async (p) => getSearchAdapter().remove(p.productIds as string[]),
  "price-alerts.check": async (p) => checkPriceAlerts(p.productId as string),
  "trust.recompute": async (p) => recomputeStoreTrust(p.storeId as string),
};

/** Claims up to `limit` jobs and runs them in priority order. */
export async function runJobs(limit = 10) {
  const claimed = await claim(limit);
  const pq = new PriorityQueue<Job>();
  for (const j of claimed) pq.push(j, j.priority);
  const results: { id: string; type: string; ok: boolean }[] = [];
  while (pq.size) {
    const job = pq.pop()!;
    try {
      const result = await handlers[job.type as JobType](job.payload as Record<string, unknown>);
      await db.job.update({ where: { id: job.id }, data: { status: "SUCCEEDED", finishedAt: new Date(), result: (result ?? null) as object, lockedAt: null } });
      results.push({ id: job.id, type: job.type, ok: true });
    } catch (err) {
      const retry = job.attempts < job.maxAttempts;
      await db.job.update({
        where: { id: job.id },
        data: {
          status: retry ? "QUEUED" : "FAILED",
          lastError: (err as Error).message.slice(0, 2000),
          lockedAt: null,
          // Exponential backoff: 30s, 2m, 8m…
          runAt: new Date(Date.now() + 30_000 * 4 ** (job.attempts - 1)),
          finishedAt: retry ? null : new Date(),
        },
      });
      results.push({ id: job.id, type: job.type, ok: false });
    }
  }
  return results;
}

/** Fire-and-forget helper for server actions: process work right away in development. */
export function kickJobs() {
  runJobs(5).catch((e) => console.warn("[jobs]", (e as Error).message));
}

// ───────────────────────────── Handlers ─────────────────────────────

export async function checkPriceAlerts(productId: string) {
  const product = await db.product.findUnique({ where: { id: productId }, select: { title: true, slug: true, basePrice: true } });
  if (!product) return { notified: 0 };
  const alerts = await db.priceAlert.findMany({
    where: { productId, active: true, targetPrice: { gte: product.basePrice } },
    include: { user: { select: { email: true } } },
  });
  for (const a of alerts) {
    await db.priceAlert.update({ where: { id: a.id }, data: { active: false, triggeredAt: new Date() } });
    await db.notification.create({
      data: { userId: a.userId, type: "PRICE_DROP", title: "Price drop", body: `${product.title} is now ${formatPrice(product.basePrice)}.`, href: `/p/${product.slug}` },
    });
    await enqueue(
      "email.send",
      {
        to: a.user.email,
        subject: `Price drop: ${product.title}`,
        html: layoutEmail("Your price alert was triggered", `<p>${product.title} is now <strong>${formatPrice(product.basePrice)}</strong>.</p><p><a href="${siteUrl(`/p/${product.slug}`)}">View product</a></p>`),
      },
      { priority: PRIORITY.high },
    );
  }
  return { notified: alerts.length };
}

export async function recomputeStoreTrust(storeId: string) {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180);
  const [items, reviews, store] = await Promise.all([
    db.orderItem.findMany({
      where: { storeId, createdAt: { gte: since } },
      select: { status: true, deliveredAt: true, order: { select: { createdAt: true } }, product: { select: { deliveryMaxDays: true } }, _count: { select: { returns: true } } },
    }),
    db.review.aggregate({ where: { product: { storeId }, status: "PUBLISHED" }, _avg: { rating: true } }),
    db.store.findUnique({ where: { id: storeId }, select: { responseTimeHours: true } }),
  ]);
  const delivered = items.filter((i) => i.status === "DELIVERED" || i.status === "RETURNED");
  const onTime = delivered.filter((i) => i.deliveredAt && i.deliveredAt.getTime() - i.order.createdAt.getTime() <= (i.product.deliveryMaxDays + 1) * 86_400_000).length;
  const inputs = {
    onTimeRate: delivered.length ? onTime / delivered.length : 0.9,
    returnRate: items.length ? items.filter((i) => i._count.returns > 0).length / items.length : 0,
    cancelRate: items.length ? items.filter((i) => i.status === "CANCELLED").length / items.length : 0,
    reviewRating: reviews._avg.rating ?? 4,
    responseHours: store?.responseTimeHours ?? 24,
  };
  const score = computeTrustScore(inputs);
  await db.trustScore.upsert({ where: { storeId }, update: { score, ...inputs, computedAt: new Date() }, create: { storeId, score, ...inputs } });
  return { score };
}

import { Play } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/server/session";
import { retryJob, runQueueNow } from "@/server/actions/admin";
import { PageHeader } from "@/components/layout/console-shell";
import { ActionButton } from "@/components/ui/action-button";
import { StatusPill } from "@/components/account/status-pill";
import { StatCard } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Job queue" };

const PRIORITY_LABEL = (p: number) => (p <= 0 ? "critical" : p <= 2 ? "high" : p <= 5 ? "normal" : "low");

export default async function JobsPage() {
  await requireRole(["ADMIN"]);
  const [counts, queued, recent] = await Promise.all([
    db.job.groupBy({ by: ["status"], _count: { _all: true } }),
    db.job.findMany({ where: { status: { in: ["QUEUED", "RUNNING"] } }, orderBy: [{ priority: "asc" }, { runAt: "asc" }], take: 30 }),
    db.job.findMany({ where: { status: { in: ["SUCCEEDED", "FAILED"] } }, orderBy: { finishedAt: "desc" }, take: 30 }),
  ]);
  const c = (s: string) => counts.find((x) => x.status === s)?._count._all ?? 0;
  const row = (j: (typeof queued)[number]) => (
    <tr key={j.id}>
      <td className="p-3 font-mono text-xs">{j.type}</td>
      <td className="p-3 text-xs capitalize">{PRIORITY_LABEL(j.priority)} ({j.priority})</td>
      <td className="p-3"><StatusPill status={j.status} /></td>
      <td className="p-3 text-xs">{j.attempts}/{j.maxAttempts}</td>
      <td className="p-3 text-xs">{formatDate(j.finishedAt ?? j.runAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
      <td className="max-w-72 truncate p-3 text-xs text-crimson">{j.lastError}</td>
      <td className="p-3 text-right">{j.status === "FAILED" && <ActionButton size="sm" variant="ghost" action={retryJob.bind(null, j.id)}>Retry</ActionButton>}</td>
    </tr>
  );
  const head = (
    <thead className="bg-sand-50 text-left text-xs text-slate uppercase">
      <tr><th scope="col" className="p-3">Type</th><th scope="col" className="p-3">Priority</th><th scope="col" className="p-3">Status</th><th scope="col" className="p-3">Attempts</th><th scope="col" className="p-3">When</th><th scope="col" className="p-3">Error</th><th scope="col" className="p-3" /></tr>
    </thead>
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Background job queue"
        subtitle="PostgreSQL-backed priority queue (lower number runs first; FOR UPDATE SKIP LOCKED for parallel workers). Emails, bulk imports, search indexing, price alerts and Trust Score updates run here."
        actions={<ActionButton variant="gold" size="sm" action={runQueueNow}><Play /> Run queue now</ActionButton>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Queued" value={String(c("QUEUED"))} />
        <StatCard label="Running" value={String(c("RUNNING"))} />
        <StatCard label="Succeeded" value={String(c("SUCCEEDED"))} />
        <StatCard label="Failed" value={String(c("FAILED"))} />
      </div>
      <section>
        <h2 className="mb-2 font-semibold">Up next (in priority order)</h2>
        <div className="overflow-x-auto rounded-[8px] border border-sand bg-white"><table className="w-full min-w-[720px] text-sm">{head}<tbody className="divide-y divide-sand">{queued.map(row)}{!queued.length && <tr><td colSpan={7} className="p-4 text-center text-slate">Queue is empty.</td></tr>}</tbody></table></div>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Recently finished</h2>
        <div className="overflow-x-auto rounded-[8px] border border-sand bg-white"><table className="w-full min-w-[720px] text-sm">{head}<tbody className="divide-y divide-sand">{recent.map(row)}</tbody></table></div>
      </section>
    </div>
  );
}

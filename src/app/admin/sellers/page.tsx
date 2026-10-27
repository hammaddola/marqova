import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/server/session";
import { decideSeller } from "@/server/actions/admin";
import { PageHeader } from "@/components/layout/console-shell";
import { ActionButton } from "@/components/ui/action-button";
import { StatusPill } from "@/components/account/status-pill";
import { EmptyState } from "@/components/ui/primitives";
import { formatDate, cn } from "@/lib/utils";

export const metadata = { title: "Seller approvals" };

export default async function SellersPage({ searchParams }: PageProps<"/admin/sellers">) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const status = (["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const).find((s) => s === sp.status) ?? "PENDING";
  const sellers = await db.sellerProfile.findMany({
    where: { status },
    orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
    take: 50,
    include: { user: { select: { email: true, name: true } }, store: { select: { name: true, slug: true, trustScore: { select: { score: true } } } }, verifications: true },
  });
  return (
    <div>
      <PageHeader title="Seller approvals" subtitle="Check ID, business and bank verification before a seller can list." />
      <nav className="mb-4 flex gap-2 text-sm" aria-label="Seller status">
        {["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].map((s) => (
          <Link key={s} href={`/admin/sellers?status=${s}`} aria-current={status === s ? "page" : undefined} className={cn("rounded-full px-3 py-1.5 capitalize", status === s ? "bg-navy-900 text-white" : "bg-white ring-1 ring-sand")}>
            {s.toLowerCase()}
          </Link>
        ))}
      </nav>
      {!sellers.length && <EmptyState title="Nothing to review" body="New applications appear here." />}
      <ul className="space-y-3">
        {sellers.map((s) => (
          <li key={s.id} className="rounded-[8px] border border-sand bg-white p-5 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold">{s.store?.name ?? s.legalName}</span>
              <StatusPill status={s.status} />
              <span className="rounded bg-sand-50 px-2 py-0.5 text-xs capitalize">{s.tier.toLowerCase()}</span>
              {s.store?.trustScore && <span className="text-xs">Trust {s.store.trustScore.score}</span>}
              <span className="ml-auto text-xs text-slate">Applied {formatDate(s.createdAt)}</span>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
              <div><dt className="inline text-slate">Legal name: </dt><dd className="inline">{s.legalName}</dd></div>
              <div><dt className="inline text-slate">Email: </dt><dd className="inline">{s.user.email}</dd></div>
              <div><dt className="inline text-slate">Phone: </dt><dd className="inline">{s.phone}</dd></div>
              <div><dt className="inline text-slate">Business: </dt><dd className="inline">{s.businessName ?? "—"} {s.registrationNumber ? `(${s.registrationNumber})` : ""}</dd></div>
              <div><dt className="inline text-slate">Bank: </dt><dd className="inline">{s.bankName} ••••{s.bankAccountLast4}</dd></div>
            </dl>
            <ul className="mt-3 flex flex-wrap gap-2 text-xs">
              {s.verifications.map((v) => (
                <li key={v.id} className="flex items-center gap-2 rounded-md bg-sand-50 px-2.5 py-1">
                  <span className="capitalize">{v.type.replace(/_/g, " ").toLowerCase()}</span>
                  <StatusPill status={v.status} />
                  {v.documentUrl && <a href={v.documentUrl} target="_blank" rel="noreferrer" className="font-semibold text-gold-text underline">View document</a>}
                  {v.notes && <span className="text-slate">{v.notes}</span>}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {s.status !== "APPROVED" && <ActionButton size="sm" variant="gold" action={decideSeller.bind(null, s.id, "APPROVED", undefined)}>Approve</ActionButton>}
              {s.status === "PENDING" && <ActionButton size="sm" variant="secondary" confirm="Reject this application?" action={decideSeller.bind(null, s.id, "REJECTED", "We couldn't verify your identity documents. Please upload a clear photo of your CNIC and re-apply.")}>Reject</ActionButton>}
              {s.status === "APPROVED" && <ActionButton size="sm" variant="danger" confirm="Suspend this seller? All their listings will be deactivated." action={decideSeller.bind(null, s.id, "SUSPENDED", "Suspended pending investigation.")}>Suspend</ActionButton>}
              {s.store && <Link href={`/store/${s.store.slug}`} className="self-center text-xs font-semibold text-gold-text hover:underline">View store</Link>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

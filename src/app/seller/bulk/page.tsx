import { db } from "@/lib/db";
import { requireSeller } from "@/server/session";
import { PageHeader } from "@/components/layout/console-shell";
import { BulkUploader } from "@/components/seller/bulk-uploader";
import { StatusPill } from "@/components/account/status-pill";
import { Card } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Bulk upload" };

export default async function BulkPage() {
  const { store } = await requireSeller();
  const [categories, uploads] = await Promise.all([
    db.category.findMany({ where: { isActive: true, children: { none: {} } }, orderBy: [{ parent: { position: "asc" } }, { position: "asc" }], select: { id: true, name: true, parent: { select: { name: true } } } }),
    db.bulkUpload.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Bulk upload" subtitle="Download the template for a category, fill it in Excel or Google Sheets, export as CSV and upload. Valid rows import as drafts even if others fail." />
      <BulkUploader categories={categories.map((c) => ({ id: c.id, name: `${c.parent?.name ?? ""} › ${c.name}` }))} />
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Recent uploads</h2>
        <ul className="divide-y divide-sand text-sm">
          {uploads.map((u) => {
            const report = (u.report as { row: number; field: string; message: string }[]) ?? [];
            return (
              <li key={u.id} className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">{u.fileName}</span>
                  <StatusPill status={u.status} />
                  <span className="text-xs text-slate">{formatDate(u.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="ml-auto text-xs">
                    <span className="font-semibold text-emerald">{u.successRows} imported</span> · <span className={u.errorRows ? "font-semibold text-crimson" : "text-slate"}>{u.errorRows} rows with errors</span> · {u.totalRows} total
                  </span>
                </div>
                {report.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-gold-text">Validation report ({report.length})</summary>
                    <table className="mt-2 w-full text-xs">
                      <thead className="text-left text-slate">
                        <tr><th scope="col" className="py-1">Row</th><th scope="col">Column</th><th scope="col">Problem</th></tr>
                      </thead>
                      <tbody>
                        {report.slice(0, 100).map((r, i) => (
                          <tr key={i} className="border-t border-sand"><td className="py-1">{r.row}</td><td>{r.field}</td><td>{r.message}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                )}
              </li>
            );
          })}
          {!uploads.length && <li className="py-3 text-slate">No uploads yet.</li>}
        </ul>
      </Card>
    </div>
  );
}

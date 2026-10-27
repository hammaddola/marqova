import { db } from "@/lib/db";
import { requireSeller } from "@/server/session";
import { revokeKey } from "@/server/actions/seller";
import { PageHeader } from "@/components/layout/console-shell";
import { Card } from "@/components/ui/primitives";
import { ActionButton } from "@/components/ui/action-button";
import { StatusPill } from "@/components/account/status-pill";
import { CreateKeyForm } from "@/components/seller/api-key-form";
import { formatDate, siteUrl } from "@/lib/utils";

export const metadata = { title: "Seller API" };

export default async function ApiPage() {
  const { store } = await requireSeller();
  const keys = await db.apiKey.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" } });
  const base = siteUrl("/api/v1");
  return (
    <div className="space-y-6">
      <PageHeader title="Seller API" subtitle="Sync listings and inventory from your ERP, POS or spreadsheet scripts." actions={<CreateKeyForm />} />
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">API keys</h2>
        <ul className="divide-y divide-sand text-sm">
          {keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <span className="font-medium">{k.name}</span>
              <code className="rounded bg-sand-50 px-2 py-0.5 text-xs">mq_live_{k.prefix}_••••</code>
              <StatusPill status={k.revokedAt ? "INACTIVE" : "ACTIVE"} />
              <span className="ml-auto text-xs text-slate">Created {formatDate(k.createdAt)}{k.lastUsedAt ? ` · last used ${formatDate(k.lastUsedAt)}` : " · never used"}</span>
              {!k.revokedAt && <ActionButton size="sm" variant="ghost" confirm="Revoke this key? Integrations using it will stop working." action={revokeKey.bind(null, k.id)}>Revoke</ActionButton>}
            </li>
          ))}
          {!keys.length && <li className="py-2 text-slate">No keys yet.</li>}
        </ul>
      </Card>
      <Card className="p-5 text-sm">
        <h2 className="mb-3 font-semibold">Quick reference</h2>
        <pre className="overflow-x-auto rounded-md bg-navy-900 p-4 text-xs leading-relaxed text-white">{`# List your products (cursor pagination)
curl -H "Authorization: Bearer $MARQOVA_KEY" "${base}/products?limit=50"

# Create or update a listing (prices in rupees)
curl -X POST -H "Authorization: Bearer $MARQOVA_KEY" -H "content-type: application/json" \\
  "${base}/products" -d '{
    "categoryId": "<category id>", "title": "Linen Camp-Collar Shirt", "description": "…",
    "bullets": ["100% linen"], "attributes": {"material": "Linen"},
    "variants": [{"sku": "LCS-NAV-M", "options": {"color": "Navy", "size": "M"}, "price": 4990, "stock": 20}],
    "media": [{"url": "https://…/front.jpg", "alt": "Front", "type": "IMAGE"}], "publish": true }'

# Set absolute stock per SKU (and optionally per warehouse)
curl -X PATCH -H "Authorization: Bearer $MARQOVA_KEY" -H "content-type: application/json" \\
  "${base}/inventory" -d '{"updates": [{"sku": "LCS-NAV-M", "quantity": 42}]}'`}</pre>
        <p className="mt-3 text-xs text-slate">Rate limit: 300 requests/minute per IP. Responses use standard HTTP codes; 207 means partial success with per-item results.</p>
      </Card>
    </div>
  );
}

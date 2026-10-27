import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/server/session";
import { deleteAttribute } from "@/server/actions/admin";
import { PageHeader } from "@/components/layout/console-shell";
import { ActionButton } from "@/components/ui/action-button";
import { Badge, Card } from "@/components/ui/primitives";
import { CategoryIcon } from "@/components/category-icon";
import { AttributeForm, CategoryForm } from "@/components/admin/category-forms";
import { cn } from "@/lib/utils";

export const metadata = { title: "Categories & commissions" };

export default async function CategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const all = await db.category.findMany({ orderBy: [{ position: "asc" }], include: { _count: { select: { products: true } } } });
  const roots = all.filter((c) => !c.parentId);
  const selectedId = typeof sp.id === "string" ? sp.id : roots[0]?.id;
  const selected = all.find((c) => c.id === selectedId);
  const attributes = selected ? await db.attributeDefinition.findMany({ where: { categoryId: selected.id }, orderBy: { position: "asc" } }) : [];
  const parents = roots.map((r) => ({ id: r.id, name: r.name }));

  return (
    <div>
      <PageHeader title="Categories & commissions" subtitle="Add any new niche without code: create a category, set its commission, then define the attribute template sellers fill in." actions={<CategoryForm parents={parents} />} />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="max-h-[75dvh] overflow-y-auto p-2">
          <ul>
            {roots.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/categories?id=${r.id}`} className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm", selectedId === r.id ? "bg-sand-50 font-semibold" : "hover:bg-sand-50")}>
                  <CategoryIcon name={r.icon} className="size-4 text-gold-text" />
                  {r.name}
                  <span className="ml-auto text-xs text-slate">{(r.commissionBps / 100).toFixed(1)}%</span>
                </Link>
                <ul className="ml-6 border-l border-sand pl-2">
                  {all.filter((c) => c.parentId === r.id).map((c) => (
                    <li key={c.id}>
                      <Link href={`/admin/categories?id=${c.id}`} className={cn("flex items-center rounded-md px-3 py-1.5 text-sm", selectedId === c.id ? "bg-sand-50 font-semibold" : "text-slate hover:bg-sand-50")}>
                        {c.name}
                        {!c.isActive && <Badge tone="outline" className="ml-2">hidden</Badge>}
                        <span className="ml-auto text-xs">{c._count.products}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Card>
        {selected && (
          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="heading-display text-2xl">{selected.name}</h2>
                  <p className="text-sm text-slate">/c/{selected.slug} · {selected._count.products} products · commission {(selected.commissionBps / 100).toFixed(1)}% · try-on: {selected.tryOnType.toLowerCase()}</p>
                </div>
                <CategoryForm parents={parents} initial={{ id: selected.id, name: selected.name, parentId: selected.parentId, icon: selected.icon, commissionPercent: selected.commissionBps / 100, tryOnType: selected.tryOnType, isActive: selected.isActive }} />
              </div>
            </Card>
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Attribute template ({attributes.length})</h3>
                <AttributeForm categoryId={selected.id} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-xs text-slate uppercase">
                    <tr><th scope="col" className="py-2">Label (key)</th><th scope="col">Type</th><th scope="col">Options</th><th scope="col">Flags</th><th scope="col" /></tr>
                  </thead>
                  <tbody className="divide-y divide-sand">
                    {attributes.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2">{a.label} <code className="text-xs text-slate">{a.key}</code></td>
                        <td className="capitalize">{a.type.toLowerCase()}{a.unit ? ` (${a.unit})` : ""}</td>
                        <td className="max-w-64 truncate text-xs text-slate">{a.options.join(", ") || "—"}</td>
                        <td className="space-x-1">
                          {a.required && <Badge tone="crimson">required</Badge>}
                          {a.variantAxis && <Badge tone="navy">variant</Badge>}
                          {a.filterable && <Badge tone="emerald">filter</Badge>}
                        </td>
                        <td className="text-right">
                          <span className="inline-flex gap-1">
                            <AttributeForm categoryId={selected.id} initial={{ id: a.id, key: a.key, label: a.label, type: a.type, options: a.options.join(", "), unit: a.unit ?? "", required: a.required, filterable: a.filterable, variantAxis: a.variantAxis }} />
                            <ActionButton size="sm" variant="ghost" confirm={`Delete attribute “${a.label}”? Existing product values are kept but no longer shown.`} action={deleteAttribute.bind(null, a.id)}>Delete</ActionButton>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

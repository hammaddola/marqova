import Link from "next/link";
import { db } from "@/lib/db";
import { requireSeller } from "@/server/session";
import { PageHeader } from "@/components/layout/console-shell";
import { InventoryCell, WarehouseForm } from "@/components/seller/inventory-controls";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({ searchParams }: PageProps<"/seller/inventory">) {
  const { store } = await requireSeller();
  const sp = await searchParams;
  const low = sp.low === "1";
  const [warehouses, variants] = await Promise.all([
    db.warehouse.findMany({ where: { storeId: store.id }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
    db.productVariant.findMany({
      where: { product: { storeId: store.id, status: { not: "REJECTED" } }, isActive: true, ...(low ? { stock: { lte: 5 } } : {}) },
      orderBy: [{ stock: "asc" }],
      take: 150,
      include: { product: { select: { id: true, title: true } }, inventory: true },
    }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" subtitle="Stock per warehouse. Sellable stock = on hand − reserved, synced to every listing." actions={<WarehouseForm />} />
      <div className="flex gap-2 text-sm">
        <Link href="/seller/inventory" className={cn("rounded-full px-3 py-1.5", !low ? "bg-navy-900 text-white" : "bg-white ring-1 ring-sand")}>All variants</Link>
        <Link href="/seller/inventory?low=1" className={cn("rounded-full px-3 py-1.5", low ? "bg-navy-900 text-white" : "bg-white ring-1 ring-sand")}>Low stock alerts</Link>
      </div>
      <div className="overflow-x-auto rounded-[8px] border border-sand bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">Inventory by warehouse</caption>
          <thead className="bg-sand-50 text-left text-xs text-slate uppercase">
            <tr>
              <th scope="col" className="p-3">Product / variant</th>
              <th scope="col" className="p-3">SKU</th>
              {warehouses.map((w) => (
                <th key={w.id} scope="col" className="p-3">{w.name}<span className="block font-normal normal-case">{w.city}</span></th>
              ))}
              <th scope="col" className="p-3 text-right">Sellable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {variants.map((v) => (
              <tr key={v.id}>
                <td className="p-3">
                  <Link href={`/seller/listings/${v.product.id}`} className="line-clamp-1 font-medium hover:text-gold-text">{v.product.title}</Link>
                  <span className="text-xs text-slate">{v.title}</span>
                </td>
                <td className="p-3 font-mono text-xs">{v.sku}</td>
                {warehouses.map((w) => {
                  const inv = v.inventory.find((i) => i.warehouseId === w.id);
                  return <td key={w.id} className="p-3">{inv ? <InventoryCell id={inv.id} quantity={inv.quantity} threshold={inv.lowStockThreshold} /> : <span className="text-xs text-slate">—</span>}</td>;
                })}
                <td className={cn("p-3 text-right font-semibold tabular-nums", v.stock === 0 ? "text-crimson" : v.stock <= 5 ? "text-amber" : "")}>{v.stock}</td>
              </tr>
            ))}
            {!variants.length && (
              <tr><td colSpan={3 + warehouses.length} className="p-8 text-center text-slate">{low ? "No low-stock variants. 🎉" : "No variants yet."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

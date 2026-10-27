import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSeller } from "@/server/session";
import { formatPrice } from "@/lib/utils";
import { PrintButton } from "@/components/seller/print-button";

export const metadata = { title: "Shipping label" };

/** Printable 4×6" shipping label. Replace the barcode block with your courier's label API when integrated. */
export default async function LabelPage({ params }: PageProps<"/seller/orders/[id]/label">) {
  const { store } = await requireSeller();
  const { id } = await params;
  const order = await db.order.findFirst({ where: { id, items: { some: { storeId: store.id } } }, include: { items: { where: { storeId: store.id } }, shipments: { where: { storeId: store.id } } } });
  if (!order) notFound();
  const a = order.shippingAddress as Record<string, string>;
  const warehouse = await db.warehouse.findFirst({ where: { storeId: store.id, isDefault: true } });
  const codAmount = order.paymentMethod === "cod" ? order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) + order.shippingTotal : 0;
  const code = order.shipments[0]?.trackingNumber ?? order.number;
  const bars = Array.from(code).flatMap((ch, i) => [ch.charCodeAt(0) % 4 + 1, ((ch.charCodeAt(0) >> 2) % 3) + 1, i % 2 + 1]);

  return (
    <div className="mx-auto max-w-md p-6 print:p-0">
      <PrintButton />
      <div className="mt-4 border-2 border-black bg-white p-5 font-mono text-sm text-black print:mt-0">
        <div className="flex items-start justify-between border-b-2 border-black pb-2">
          <span className="font-display text-xl font-bold">Marqova Express</span>
          <span className="text-right text-xs">{order.deliveryOption.toUpperCase()}<br />{order.number}</span>
        </div>
        <div className="border-b border-black py-3 text-xs">
          <p className="font-bold">FROM</p>
          <p>{store.name}</p>
          <p>{warehouse?.name}, {warehouse?.city}</p>
        </div>
        <div className="border-b border-black py-3">
          <p className="text-xs font-bold">TO</p>
          <p className="text-lg font-bold">{a.fullName}</p>
          <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
          <p className="font-bold">{a.city}, {a.region} {a.postalCode}</p>
          <p>{a.phone}</p>
        </div>
        {codAmount > 0 && <p className="border-b border-black py-2 text-center text-lg font-bold">COLLECT CASH: {formatPrice(codAmount)}</p>}
        <div className="flex h-20 items-end justify-center gap-px pt-3" aria-label={`Barcode ${code}`}>
          {bars.map((w, i) => (
            <span key={i} className={i % 2 ? "bg-white" : "bg-black"} style={{ width: w * 2, height: "100%" }} />
          ))}
        </div>
        <p className="text-center tracking-[0.3em]">{code}</p>
        <p className="mt-2 border-t border-black pt-2 text-xs">{order.items.map((i) => `${i.quantity}× ${i.title.slice(0, 28)}`).join(" · ")}</p>
      </div>
    </div>
  );
}

import { MapPin, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/server/session";
import { deleteAddress } from "@/server/actions/shopper";
import { ActionButton } from "@/components/ui/action-button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { AddressForm } from "@/components/account/address-form";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="heading-display text-3xl">Addresses</h1>
        <AddressForm />
      </div>
      {!addresses.length && <EmptyState icon={<MapPin />} title="No saved addresses" body="Save an address for faster checkout." />}
      <ul className="grid gap-3 md:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="flex gap-3 rounded-[8px] border border-sand bg-white p-4 text-sm">
            <div className="flex-1">
              <p className="font-semibold">
                {a.label} {a.isDefault && <Badge tone="gold" className="ml-1">Default</Badge>}
              </p>
              <p>{a.fullName}</p>
              <p className="text-slate">
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.region} {a.postalCode}
              </p>
              <p className="text-slate">{a.phone}</p>
            </div>
            <ActionButton variant="ghost" size="iconSm" aria-label="Delete address" confirm="Delete this address?" action={deleteAddress.bind(null, a.id)} successMessage="Address deleted">
              <Trash2 />
            </ActionButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

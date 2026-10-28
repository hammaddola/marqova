"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Banknote, Check, CreditCard, Lock, MapPin, Package, Truck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Field, Input, Checkbox, Select } from "@/components/ui/form";
import { CITIES, PROVINCES } from "@/lib/pakistan";
import { ProductImage } from "@/components/brand";
import { OrderSummary } from "@/components/cart/summary";
import { addressSchema } from "@/lib/validation";
import { placeOrder } from "@/server/actions/checkout";
import { formatDeliveryWindow, type DeliveryOption } from "@/lib/delivery";
import type { Totals } from "@/lib/pricing";
import { cn, formatPrice } from "@/lib/utils";

const formSchema = z.object({ email: z.email("Enter a valid email for your receipt"), address: addressSchema });
type FormValues = z.input<typeof formSchema>;

type Address = z.infer<typeof addressSchema> & { id: string };
type Props = {
  email: string;
  signedIn: boolean;
  cancelled: boolean;
  addresses: Address[];
  providers: { id: string; label: string; description: string }[];
  options: DeliveryOption[];
  quotes: Record<string, Totals>;
  items: { id: string; title: string; variant: string; quantity: number; price: number; image: string | null; minDays: number; maxDays: number }[];
};

const PAY_ICON: Record<string, typeof CreditCard> = { stripe: CreditCard, cod: Banknote, mock: Wallet };

function Step({ n, title, icon: Icon, children }: { n: number; title: string; icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: n * 0.05 }} className="rounded-[8px] border border-sand bg-white p-5 sm:p-6" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="mb-4 flex items-center gap-3 text-base font-semibold">
        <span className="grid size-7 place-items-center rounded-full bg-navy-900 text-xs text-white">{n}</span>
        <Icon className="size-4 text-gold-text" aria-hidden />
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

export function CheckoutForm(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [deliveryId, setDeliveryId] = useState<DeliveryOption["id"]>("standard");
  const [payment, setPayment] = useState(p.providers[0]?.id ?? "");
  const [addressId, setAddressId] = useState<string | "new">(p.addresses[0]?.id ?? "new");
  const [saveAddress, setSaveAddress] = useState(true);
  const fallback = p.addresses[0];
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: p.email,
      address: fallback ? { ...fallback } : { label: "Home", fullName: "", phone: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "PK" },
    },
  });
  const errors = form.formState.errors;
  const totals = p.quotes[deliveryId];
  const maxDays = Math.max(...p.items.map((i) => i.maxDays));
  const minDays = Math.max(...p.items.map((i) => i.minDays));

  const chooseAddress = (id: string) => {
    setAddressId(id);
    const a = p.addresses.find((x) => x.id === id);
    if (a) form.reset({ email: form.getValues("email"), address: { ...a } });
  };

  const submit = form.handleSubmit((values) =>
    start(async () => {
      const res = await placeOrder({ ...values, deliveryId, paymentMethod: payment, saveAddress: p.signedIn && addressId === "new" && saveAddress });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.data!.redirectUrl.startsWith("http")) window.location.href = res.data!.redirectUrl;
      else router.push(res.data!.redirectUrl);
    }),
  );

  const reg = (name: keyof FormValues["address"]) => ({ ...form.register(`address.${name}`), "aria-invalid": !!errors.address?.[name] });

  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        {p.cancelled && <p className="rounded-[8px] bg-crimson-50 px-4 py-3 text-sm text-crimson">Card payment was cancelled. Your items are still reserved for a few minutes — try again or choose another method.</p>}
        {!p.signedIn && (
          <p className="rounded-[8px] bg-sand-50 px-4 py-3 text-sm">
            Checking out as a guest.{" "}
            <Link href="/login?next=/checkout" className="font-semibold text-gold-text underline">
              Sign in
            </Link>{" "}
            to use saved addresses and track orders in your account.
          </p>
        )}

        <Step n={1} title="Contact & delivery address" icon={MapPin}>
          <Field label="Email for receipt & tracking" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} aria-invalid={!!errors.email} />
          </Field>
          {p.addresses.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Saved addresses">
              {p.addresses.map((a) => (
                <button key={a.id} type="button" role="radio" aria-checked={addressId === a.id} onClick={() => chooseAddress(a.id)} className={cn("rounded-[8px] border p-3 text-left text-sm transition-colors", addressId === a.id ? "border-navy-900 ring-1 ring-navy-900" : "border-sand hover:border-slate/40")}>
                  <span className="font-semibold">{a.label}</span> — {a.fullName}
                  <span className="block text-xs text-slate">
                    {a.line1}, {a.city}
                  </span>
                </button>
              ))}
              <button type="button" role="radio" aria-checked={addressId === "new"} onClick={() => setAddressId("new")} className={cn("rounded-[8px] border border-dashed p-3 text-left text-sm", addressId === "new" ? "border-navy-900" : "border-sand")}>
                + Use a new address
              </button>
            </div>
          )}
          {(addressId === "new" || !p.addresses.length) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="fullName" error={errors.address?.fullName?.message}>
                <Input id="fullName" autoComplete="name" {...reg("fullName")} />
              </Field>
              <Field label="Phone" htmlFor="phone" error={errors.address?.phone?.message}>
                <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" {...reg("phone")} />
              </Field>
              <Field label="Street address" htmlFor="line1" error={errors.address?.line1?.message} className="sm:col-span-2">
                <Input id="line1" autoComplete="address-line1" {...reg("line1")} />
              </Field>
              <Field label="Area / apartment (optional)" htmlFor="line2" className="sm:col-span-2">
                <Input id="line2" autoComplete="address-line2" {...reg("line2")} />
              </Field>
              <Field label="City" htmlFor="city" error={errors.address?.city?.message}>
                <Input id="city" autoComplete="address-level2" list="pk-cities" {...reg("city")} />
                <datalist id="pk-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
              <Field label="Province / territory" htmlFor="region" error={errors.address?.region?.message}>
                <Select id="region" autoComplete="address-level1" {...reg("region")}>
                  <option value="" disabled>Choose…</option>
                  {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="Postal code" htmlFor="postalCode" error={errors.address?.postalCode?.message}>
                <Input id="postalCode" autoComplete="postal-code" inputMode="numeric" maxLength={5} placeholder="54000" {...reg("postalCode")} />
              </Field>
              {p.signedIn && (
                <label className="flex items-center gap-2 self-end pb-3 text-sm">
                  <Checkbox checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} /> Save to my addresses
                </label>
              )}
            </div>
          )}
        </Step>

        <Step n={2} title="Delivery option" icon={Truck}>
          <div className="grid gap-2" role="radiogroup" aria-label="Delivery option">
            {p.options.map((o) => {
              const q = p.quotes[o.id];
              const extraMin = Math.max(0, minDays - 2);
              const extraMax = Math.max(0, maxDays - 5);
              return (
                <button key={o.id} type="button" role="radio" aria-checked={deliveryId === o.id} onClick={() => setDeliveryId(o.id)} className={cn("flex items-center gap-3 rounded-[8px] border p-4 text-left transition-colors", deliveryId === o.id ? "border-navy-900 ring-1 ring-navy-900" : "border-sand hover:border-slate/40")}>
                  <span className={cn("grid size-5 place-items-center rounded-full border-2", deliveryId === o.id ? "border-navy-900 bg-navy-900" : "border-sand")}>{deliveryId === o.id && <Check className="size-3 text-white" />}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{o.label}</span>
                    <span className="block text-xs text-slate">Arrives {formatDeliveryWindow(o.minDays + extraMin, o.maxDays + extraMax)}</span>
                  </span>
                  <span className={cn("text-sm font-semibold", q.shipping === 0 && "text-emerald")}>{q.shipping === 0 ? "FREE" : formatPrice(q.shipping)}</span>
                </button>
              );
            })}
          </div>
        </Step>

        <Step n={3} title="Payment" icon={Lock}>
          <div className="grid gap-2" role="radiogroup" aria-label="Payment method">
            {p.providers.map((m) => {
              const Icon = PAY_ICON[m.id] ?? Wallet;
              return (
                <button key={m.id} type="button" role="radio" aria-checked={payment === m.id} onClick={() => setPayment(m.id)} className={cn("flex items-center gap-3 rounded-[8px] border p-4 text-left transition-colors", payment === m.id ? "border-navy-900 ring-1 ring-navy-900" : "border-sand hover:border-slate/40")}>
                  <Icon className="size-5 text-gold-text" aria-hidden />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{m.label}</span>
                    <span className="block text-xs text-slate">{m.description}</span>
                  </span>
                  {payment === m.id && <Check className="size-4 text-navy-900" aria-hidden />}
                </button>
              );
            })}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate">
            <Lock className="size-3.5" aria-hidden /> Card details are entered on the payment provider&apos;s secure page. Marqova never sees or stores card numbers.
          </p>
        </Step>

        <Step n={4} title="Review items" icon={Package}>
          <ul className="divide-y divide-sand">
            {p.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-sand-50">{i.image && <ProductImage src={i.image} alt="" sizes="56px" />}</span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="line-clamp-1 font-medium">{i.title}</span>
                  <span className="text-xs text-slate">
                    {i.variant} × {i.quantity}
                  </span>
                </span>
                <span className="text-sm font-semibold tabular-nums">{formatPrice(i.price)}</span>
              </li>
            ))}
          </ul>
        </Step>
      </div>

      <div className="lg:sticky lg:top-32 lg:self-start">
        <OrderSummary totals={totals} itemCount={p.items.reduce((s, i) => s + i.quantity, 0)}>
          <Button type="submit" variant="navy" size="lg" className="mt-4 w-full" loading={pending} disabled={!payment}>
            <Lock /> Place order · {formatPrice(totals.total)}
          </Button>
          <p className="mt-3 text-center text-xs text-slate">
            By placing your order you agree to the <Link href="/legal/terms" className="underline">terms</Link> and{" "}
            <Link href="/legal/returns" className="underline">return policy</Link>.
          </p>
        </OrderSummary>
      </div>
    </form>
  );
}

"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { createCampaign, createCoupon, createFlashDeal } from "@/server/actions/seller";
import type { ActionResult } from "@/lib/validation";

function useSubmit(fn: (data: Record<string, FormDataEntryValue>) => Promise<ActionResult>) {
  const [pending, start] = useTransition();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    start(async () => {
      const res = await fn(data);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      form.reset();
    });
  };
  return { pending, onSubmit };
}

export function CouponForm() {
  const { pending, onSubmit } = useSubmit(createCoupon);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Code" htmlFor="cp-code"><Input id="cp-code" name="code" placeholder="SUMMER15" className="uppercase" required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type" htmlFor="cp-type">
          <Select id="cp-type" name="type">
            <option value="PERCENT">% off</option>
            <option value="FIXED">Rs off</option>
            <option value="FREE_SHIPPING">Free delivery</option>
          </Select>
        </Field>
        <Field label="Value" htmlFor="cp-val"><Input id="cp-val" name="value" inputMode="decimal" defaultValue="10" /></Field>
        <Field label="Min. spend (Rs)" htmlFor="cp-min"><Input id="cp-min" name="minSubtotal" inputMode="decimal" defaultValue="0" /></Field>
        <Field label="Valid for (days)" htmlFor="cp-days"><Input id="cp-days" name="days" inputMode="numeric" defaultValue="30" /></Field>
      </div>
      <Button type="submit" variant="navy" className="w-full" loading={pending}>Create coupon</Button>
    </form>
  );
}

export function DealForm({ products }: { products: { id: string; title: string }[] }) {
  const { pending, onSubmit } = useSubmit(createFlashDeal);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Listing" htmlFor="dl-p">
        <Select id="dl-p" name="productId">{products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Discount %" htmlFor="dl-pct"><Input id="dl-pct" name="discountPercent" inputMode="numeric" defaultValue="15" /></Field>
        <Field label="Duration (hours)" htmlFor="dl-h"><Input id="dl-h" name="hours" inputMode="numeric" defaultValue="24" /></Field>
      </div>
      <p className="text-xs text-slate">The current price becomes the “was” price and is recorded in price history — no inflated discounts.</p>
      <Button type="submit" variant="navy" className="w-full" loading={pending} disabled={!products.length}>Start deal</Button>
    </form>
  );
}

export function CampaignForm({ products }: { products: { id: string; title: string }[] }) {
  const { pending, onSubmit } = useSubmit(createCampaign);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Listing" htmlFor="cm-p">
        <Select id="cm-p" name="productId">{products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Max cost per click (Rs)" htmlFor="cm-bid"><Input id="cm-bid" name="cpcBid" inputMode="decimal" defaultValue="15" /></Field>
        <Field label="Daily budget (Rs)" htmlFor="cm-bud"><Input id="cm-bud" name="dailyBudget" inputMode="decimal" defaultValue="1000" /></Field>
      </div>
      <Button type="submit" variant="navy" className="w-full" loading={pending} disabled={!products.length}>Launch campaign</Button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { applyAsSeller } from "@/server/actions/seller";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/validation";

const STEPS = ["About you", "Your store", "Getting paid"];

export function OnboardingForm() {
  const [step, setStep] = useState(0);
  const [tier, setTier] = useState("INDIVIDUAL");
  const router = useRouter();
  const [state, action, pending] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const res = await applyAsSeller(prev, fd);
    if (res.ok) {
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.error);
      // Jump back to the step that holds the first invalid field.
      const fieldStep = (k: string) => (["tier", "legalName", "phone", "idDocument"].includes(k) ? 0 : ["storeName", "businessName", "registrationNumber"].includes(k) ? 1 : 2);
      const first = Object.keys(res.fields ?? {})[0];
      if (first) setStep(fieldStep(first));
    }
    return res;
  }, null);
  const f = state && !state.ok ? state.fields ?? {} : {};

  return (
    <form action={action} className="rounded-[8px] border border-sand bg-white p-6" encType="multipart/form-data">
      <ol className="mb-6 flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <button type="button" onClick={() => setStep(i)} className="w-full text-left" aria-current={i === step ? "step" : undefined}>
              <span className={cn("block h-1.5 rounded-full transition-colors", i <= step ? "bg-gold-500" : "bg-sand")} />
              <span className={cn("mt-1.5 block text-xs", i === step ? "font-semibold text-ink" : "text-slate")}>
                {i + 1}. {s}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {/* All fields stay mounted (hidden when not on their step) so one submit sends everything. */}
      <div className={cn("grid gap-4 sm:grid-cols-2", step !== 0 && "hidden")}>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium">Seller type</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["INDIVIDUAL", "Individual", "Selling on your own"],
              ["BUSINESS", "Business", "Registered company"],
              ["BRAND", "Brand", "You own the brand"],
            ].map(([v, l, d]) => (
              <label key={v} className={cn("cursor-pointer rounded-[8px] border p-3 text-sm", tier === v ? "border-navy-900 ring-1 ring-navy-900" : "border-sand")}>
                <input type="radio" name="tier" value={v} checked={tier === v} onChange={() => setTier(v)} className="sr-only" />
                <span className="font-semibold">{l}</span>
                <span className="block text-xs text-slate">{d}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Legal name (as on your ID)" htmlFor="legalName" error={f.legalName}>
          <Input id="legalName" name="legalName" autoComplete="name" />
        </Field>
        <Field label="Phone" htmlFor="phone" error={f.phone}>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Field label="ID document (CNIC / passport photo)" htmlFor="idDocument" error={f.idDocument} hint="JPG, PNG or WebP. Visible to the verification team only." className="sm:col-span-2">
          <Input id="idDocument" name="idDocument" type="file" accept="image/jpeg,image/png,image/webp" className="py-2" />
        </Field>
      </div>

      <div className={cn("grid gap-4 sm:grid-cols-2", step !== 1 && "hidden")}>
        <Field label="Store name" htmlFor="storeName" error={f.storeName} hint="Shown to shoppers. You can change it later." className="sm:col-span-2">
          <Input id="storeName" name="storeName" />
        </Field>
        <Field label="Business name (optional)" htmlFor="businessName" error={f.businessName}>
          <Input id="businessName" name="businessName" />
        </Field>
        <Field label="Registration / NTN number" htmlFor="registrationNumber" error={f.registrationNumber} hint={tier === "INDIVIDUAL" ? "Optional for individuals" : "Required for businesses and brands"}>
          <Input id="registrationNumber" name="registrationNumber" />
        </Field>
      </div>

      <div className={cn("grid gap-4 sm:grid-cols-2", step !== 2 && "hidden")}>
        <Field label="Account holder name" htmlFor="bankAccountName" error={f.bankAccountName}>
          <Input id="bankAccountName" name="bankAccountName" />
        </Field>
        <Field label="Bank" htmlFor="bankName" error={f.bankName}>
          <Select id="bankName" name="bankName" defaultValue="">
            <option value="" disabled>Choose your bank</option>
            {["HBL", "UBL", "Meezan Bank", "MCB", "Allied Bank", "Bank Alfalah", "Standard Chartered", "Other"].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Select>
        </Field>
        <Field label="IBAN" htmlFor="iban" error={f.iban} hint="Only the last 4 digits are stored by Marqova." className="sm:col-span-2">
          <Input id="iban" name="iban" autoComplete="off" placeholder="PK36 SCBL 0000 0011 2345 6702" />
        </Field>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="agree" className="mt-0.5 size-4 accent-navy-900" />
          <span>
            I agree to the{" "}
            <Link href="/legal/seller-agreement" target="_blank" className="font-semibold text-gold-text underline">
              seller agreement
            </Link>{" "}
            and confirm my products are genuine.
          </span>
        </label>
        {f.agree && <p className="text-xs text-crimson sm:col-span-2">{f.agree}</p>}
      </div>

      <div className="mt-6 flex justify-between">
        <Button type="button" variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          Back
        </Button>
        {step < 2 ? (
          <Button type="button" variant="navy" onClick={() => setStep(step + 1)}>
            Continue
          </Button>
        ) : (
          <Button type="submit" variant="gold" loading={pending}>
            Submit application
          </Button>
        )}
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { addAddress } from "@/server/actions/shopper";

const FIELDS = [
  ["label", "Label (Home, Work…)", "sm:col-span-1"],
  ["fullName", "Full name", "sm:col-span-1"],
  ["phone", "Phone", "sm:col-span-2"],
  ["line1", "Street address", "sm:col-span-2"],
  ["line2", "Area / apartment (optional)", "sm:col-span-2"],
  ["city", "City", ""],
  ["region", "Province / region", ""],
  ["postalCode", "Postal code", ""],
] as const;

export function AddressForm() {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="navy" size="sm">
          <Plus /> Add address
        </Button>
      </DialogTrigger>
      <DialogContent title="Add an address">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.currentTarget));
            start(async () => {
              const res = await addAddress(data);
              if (!res.ok) {
                setErrors(Object.fromEntries(Object.entries(res.fields ?? {}).map(([k, v]) => [k, v])));
                return void toast.error(res.error);
              }
              toast.success(res.message);
              setOpen(false);
            });
          }}
        >
          {FIELDS.map(([name, label, span]) => (
            <Field key={name} label={label} htmlFor={`addr-${name}`} error={errors[name]} className={span}>
              <Input id={`addr-${name}`} name={name} defaultValue={name === "label" ? "Home" : ""} aria-invalid={!!errors[name]} />
            </Field>
          ))}
          <Button type="submit" variant="navy" className="sm:col-span-2" loading={pending}>
            Save address
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

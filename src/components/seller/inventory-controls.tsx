"use client";

import { useState, useTransition } from "react";
import { Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { addWarehouse, setInventory } from "@/server/actions/seller";
import { cn } from "@/lib/utils";

export function InventoryCell({ id, quantity, threshold }: { id: string; quantity: number; threshold: number }) {
  const [value, setValue] = useState(String(quantity));
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const dirty = value !== String(quantity) && !saved;
  const save = () =>
    start(async () => {
      const res = await setInventory(id, Number(value));
      if (!res.ok) return void toast.error(res.error);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  return (
    <span className="flex items-center gap-1">
      <label className="sr-only" htmlFor={`inv-${id}`}>Quantity</label>
      <input
        id={`inv-${id}`}
        inputMode="numeric"
        value={value}
        onChange={(e) => (setValue(e.target.value.replace(/\D/g, "")), setSaved(false))}
        onKeyDown={(e) => e.key === "Enter" && save()}
        onBlur={() => dirty && save()}
        className={cn("h-8 w-20 rounded border px-2 tabular-nums", Number(value) <= threshold ? "border-amber/50 bg-amber/5" : "border-sand")}
      />
      {pending ? <Loader2 className="size-3.5 animate-spin text-slate" /> : saved ? <Check className="size-3.5 text-emerald" /> : null}
    </span>
  );
}

export function WarehouseForm() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="navy" size="sm"><Plus /> Add warehouse</Button>
      </DialogTrigger>
      <DialogContent title="Add a warehouse">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await addWarehouse(String(fd.get("name")), String(fd.get("city")));
              if (!res.ok) return void toast.error(res.error);
              toast.success(res.message);
              setOpen(false);
            });
          }}
        >
          <Field label="Name" htmlFor="wh-name"><Input id="wh-name" name="name" required /></Field>
          <Field label="City" htmlFor="wh-city"><Input id="wh-city" name="city" required /></Field>
          <Button type="submit" variant="navy" className="w-full" loading={pending}>Save warehouse</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

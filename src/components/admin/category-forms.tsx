"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { CATEGORY_ICON_NAMES } from "@/components/category-icon";
import { saveAttribute, saveCategory } from "@/server/actions/admin";

type CategoryInitial = { id: string; name: string; parentId: string | null; icon: string; commissionPercent: number; tryOnType: string; isActive: boolean };

export function CategoryForm({ parents, initial }: { parents: { id: string; name: string }[]; initial?: CategoryInitial }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={initial ? "secondary" : "navy"} size="sm">{initial ? <><Pencil /> Edit</> : <><Plus /> New category</>}</Button>
      </DialogTrigger>
      <DialogContent title={initial ? `Edit ${initial.name}` : "New category"} description="New sub-categories copy their parent's attribute template, which you can then adjust.">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = Object.fromEntries(new FormData(e.currentTarget));
            start(async () => {
              const res = await saveCategory({ ...fd, id: initial?.id, isActive: fd.isActive === "on" });
              if (!res.ok) return void toast.error(res.error);
              toast.success(res.message);
              setOpen(false);
            });
          }}
        >
          <Field label="Name" htmlFor="c-name" className="sm:col-span-2"><Input id="c-name" name="name" defaultValue={initial?.name} required /></Field>
          <Field label="Parent" htmlFor="c-parent">
            <Select id="c-parent" name="parentId" defaultValue={initial?.parentId ?? ""}>
              <option value="">— Top level —</option>
              {parents.filter((p) => p.id !== initial?.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Icon" htmlFor="c-icon">
            <Select id="c-icon" name="icon" defaultValue={initial?.icon ?? "Package"}>
              {CATEGORY_ICON_NAMES.map((i) => <option key={i}>{i}</option>)}
            </Select>
          </Field>
          <Field label="Commission %" htmlFor="c-comm"><Input id="c-comm" name="commissionPercent" inputMode="decimal" defaultValue={initial?.commissionPercent ?? 10} /></Field>
          <Field label="Try-on type" htmlFor="c-try">
            <Select id="c-try" name="tryOnType" defaultValue={initial?.tryOnType ?? "NONE"}>
              {["NONE", "TOP", "BOTTOM", "DRESS", "SHOES", "ACCESSORY"].map((t) => <option key={t} value={t}>{t.toLowerCase()}</option>)}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox name="isActive" defaultChecked={initial?.isActive ?? true} /> Visible in the store</label>
          <Button type="submit" variant="navy" className="sm:col-span-2" loading={pending}>Save category</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type AttrInitial = { id: string; key: string; label: string; type: string; options: string; unit: string; required: boolean; filterable: boolean; variantAxis: boolean };

export function AttributeForm({ categoryId, initial }: { categoryId: string; initial?: AttrInitial }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={initial ? "ghost" : "secondary"} size="sm">{initial ? "Edit" : <><Plus /> Add attribute</>}</Button>
      </DialogTrigger>
      <DialogContent title={initial ? `Edit ${initial.label}` : "Add attribute"} description="Variant attributes (e.g. color, size) build the variant matrix. Filterable ones become search facets automatically.">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = Object.fromEntries(new FormData(e.currentTarget));
            start(async () => {
              const res = await saveAttribute({ ...fd, id: initial?.id, categoryId, required: fd.required === "on", filterable: fd.filterable === "on", variantAxis: fd.variantAxis === "on" });
              if (!res.ok) {
                setErrors(res.fields ?? {});
                return void toast.error(res.error);
              }
              toast.success(res.message);
              setOpen(false);
            });
          }}
        >
          <Field label="Label" htmlFor="a-label" error={errors.label}><Input id="a-label" name="label" defaultValue={initial?.label} required /></Field>
          <Field label="Key" htmlFor="a-key" error={errors.key} hint="e.g. material, screenSize"><Input id="a-key" name="key" defaultValue={initial?.key} required /></Field>
          <Field label="Type" htmlFor="a-type">
            <Select id="a-type" name="type" defaultValue={initial?.type ?? "SELECT"}>
              {["TEXT", "NUMBER", "SELECT", "MULTISELECT", "BOOLEAN", "COLOR", "SIZE"].map((t) => <option key={t} value={t}>{t.toLowerCase()}</option>)}
            </Select>
          </Field>
          <Field label="Unit (optional)" htmlFor="a-unit"><Input id="a-unit" name="unit" defaultValue={initial?.unit} placeholder="cm, kg, GB…" /></Field>
          <Field label="Options (comma separated)" htmlFor="a-opts" className="sm:col-span-2"><Input id="a-opts" name="options" defaultValue={initial?.options} placeholder="Cotton, Linen, Wool" /></Field>
          <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
            <label className="flex items-center gap-2"><Checkbox name="required" defaultChecked={initial?.required} /> Required</label>
            <label className="flex items-center gap-2"><Checkbox name="filterable" defaultChecked={initial?.filterable ?? true} /> Search filter</label>
            <label className="flex items-center gap-2"><Checkbox name="variantAxis" defaultChecked={initial?.variantAxis} /> Variant option</label>
          </div>
          <Button type="submit" variant="navy" className="sm:col-span-2" loading={pending}>Save attribute</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

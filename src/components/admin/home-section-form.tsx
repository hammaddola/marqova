"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { saveHomeSection } from "@/server/actions/admin";

type Initial = { id: string; title: string; subtitle: string; href: string; position: number; active: boolean };

export function HomeSectionForm({ initial }: { initial?: Initial }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={initial ? "ghost" : "navy"} size="sm">{initial ? "Edit" : <><Plus /> New section</>}</Button>
      </DialogTrigger>
      <DialogContent title={initial ? "Edit section" : "New homepage section"}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = Object.fromEntries(new FormData(e.currentTarget));
            start(async () => {
              const res = await saveHomeSection({ ...fd, id: initial?.id, active: fd.active === "on" });
              if (!res.ok) return void toast.error(res.error);
              toast.success(res.message);
              setOpen(false);
            });
          }}
        >
          <Field label="Title" htmlFor="h-title"><Input id="h-title" name="title" defaultValue={initial?.title} required /></Field>
          <Field label="Subtitle" htmlFor="h-sub"><Input id="h-sub" name="subtitle" defaultValue={initial?.subtitle} /></Field>
          <Field label="Link (internal path)" htmlFor="h-href"><Input id="h-href" name="href" defaultValue={initial?.href} placeholder="/c/fashion" /></Field>
          <Field label="Position" htmlFor="h-pos"><Input id="h-pos" name="position" inputMode="numeric" defaultValue={initial?.position ?? 0} /></Field>
          <label className="flex items-center gap-2 text-sm"><Checkbox name="active" defaultChecked={initial?.active ?? true} /> Active</label>
          <Button type="submit" variant="navy" className="w-full" loading={pending}>Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

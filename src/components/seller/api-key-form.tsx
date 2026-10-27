"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { createKey } from "@/server/actions/seller";

export function CreateKeyForm() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [name, setName] = useState("Inventory sync");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={(o) => (setOpen(o), !o && setKey(null))}>
      <DialogTrigger asChild>
        <Button variant="navy" size="sm"><KeyRound /> Create API key</Button>
      </DialogTrigger>
      <DialogContent title={key ? "Copy your key now" : "Create an API key"} description={key ? "For your security this is the only time the full key is shown." : undefined}>
        {key ? (
          <div className="space-y-3">
            <code className="block rounded-md bg-navy-900 p-3 text-xs break-all text-gold-300">{key}</code>
            <Button variant="gold" className="w-full" onClick={() => navigator.clipboard.writeText(key).then(() => toast.success("Copied"))}>
              <Copy /> Copy key
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await createKey(name);
                if (!res.ok) return void toast.error(res.error);
                setKey(res.data!.key);
              });
            }}
          >
            <Field label="Key name" htmlFor="key-name"><Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Button type="submit" variant="navy" className="w-full" loading={pending}>Create key</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

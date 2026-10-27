"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { sendMessageToStore } from "@/server/actions/shopper";

export function ContactSeller({ storeId, storeName }: { storeId: string; storeName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gold">
          <MessageSquare /> Contact seller
        </Button>
      </DialogTrigger>
      <DialogContent title={`Message ${storeName}`} description="Keep conversations on Marqova so Buyer Protection covers you.">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await sendMessageToStore(storeId, String(fd.get("subject")), String(fd.get("body")));
              if (!res.ok) return void toast.error(res.error, res.error.includes("sign in") ? { action: { label: "Sign in", onClick: () => router.push("/login") } } : undefined);
              toast.success(res.message);
              setOpen(false);
            });
          }}
        >
          <Field label="Subject" htmlFor="cs-subject">
            <Input id="cs-subject" name="subject" maxLength={120} placeholder="e.g. Question about sizing" />
          </Field>
          <Field label="Message" htmlFor="cs-body">
            <Textarea id="cs-body" name="body" rows={5} maxLength={4000} required />
          </Field>
          <Button type="submit" variant="navy" className="w-full" loading={pending}>
            Send message
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useActionState, useState, useTransition } from "react";
import { Star, RotateCcw, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { requestReturn, submitReview } from "@/server/actions/shopper";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/validation";

export function ReviewDialog({ orderItemId, title, apparel, size }: { orderItemId: string; title: string; apparel: boolean; size: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [state, action, pending] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const res = await submitReview(prev, fd);
    if (res.ok) {
      toast.success(res.message);
      setOpen(false);
    } else if (!res.fields) toast.error(res.error);
    return res;
  }, null);
  const f = state && !state.ok ? state.fields ?? {} : {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="gold">
          <PenLine /> Write a review
        </Button>
      </DialogTrigger>
      <DialogContent title="Review your purchase" description={title}>
        <form action={action} className="space-y-4" encType="multipart/form-data">
          <input type="hidden" name="orderItemId" value={orderItemId} />
          <input type="hidden" name="rating" value={rating || ""} />
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Overall rating</legend>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className="p-0.5">
                  <Star className={cn("size-8 transition-colors", n <= rating ? "text-gold-600" : "text-sand")} fill="currentColor" strokeWidth={0} />
                </button>
              ))}
            </div>
            {f.rating && <p className="mt-1 text-xs text-crimson">Choose a star rating</p>}
          </fieldset>
          <Field label="Headline" htmlFor="r-title" error={f.title}>
            <Input id="r-title" name="title" maxLength={120} required />
          </Field>
          <Field label="Your review" htmlFor="r-body" error={f.body} hint="What did you like or dislike? How did you use it?">
            <Textarea id="r-body" name="body" rows={5} maxLength={5000} required />
          </Field>
          {apparel && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Fit" htmlFor="r-fit">
                <Select id="r-fit" name="fit" defaultValue="TRUE_TO_SIZE">
                  <option value="RUNS_SMALL">Runs small</option>
                  <option value="TRUE_TO_SIZE">True to size</option>
                  <option value="RUNS_LARGE">Runs large</option>
                </Select>
              </Field>
              <Field label="Your height (cm)" htmlFor="r-height">
                <Input id="r-height" name="reviewerHeightCm" inputMode="numeric" />
              </Field>
              <Field label="Size bought" htmlFor="r-size">
                <Input id="r-size" name="sizeBought" defaultValue={size} />
              </Field>
            </div>
          )}
          <Field label="Photos (optional, up to 5)" htmlFor="r-photos">
            <Input id="r-photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="py-2" />
          </Field>
          <Button type="submit" variant="navy" className="w-full" loading={pending}>
            Submit review
          </Button>
          <p className="text-xs text-slate">Reviews are checked for copied text and unusual activity before they go live.</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const REASONS = ["Doesn't fit", "Damaged or defective", "Not as described", "Arrived too late", "Changed my mind", "Wrong item received"];

export function ReturnDialog({ orderItemId, title }: { orderItemId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <RotateCcw /> Return item
        </Button>
      </DialogTrigger>
      <DialogContent title="Request a return" description={title}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await requestReturn({ orderItemId, reason, details });
              if (!res.ok) return void toast.error(res.error);
              toast.success(res.message);
              setOpen(false);
            });
          }}
        >
          <Field label="Reason" htmlFor="ret-reason">
            <Select id="ret-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </Field>
          <Field label="Details (optional)" htmlFor="ret-details">
            <Textarea id="ret-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} />
          </Field>
          <Button type="submit" variant="navy" className="w-full" loading={pending}>
            Submit return request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

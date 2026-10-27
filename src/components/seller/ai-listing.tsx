"use client";

import { useState, useTransition } from "react";
import { Camera, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { aiDraftFromPhotos } from "@/server/actions/seller";
import { EMPTY_INITIAL, ProductWizard, type WizardCategory, type WizardInitial } from "./product-wizard";

export function AiListing({ categories, provider }: { categories: WizardCategory[]; provider: string }) {
  const [draft, setDraft] = useState<WizardInitial | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [pending, start] = useTransition();

  if (draft) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 rounded-[8px] bg-gold-100/60 px-4 py-3 text-sm">
          <Sparkles className="size-4 text-gold-text" aria-hidden /> Draft ready{provider === "mock" ? " (mock AI — connect a real provider in .env)" : ""}. Check every detail, add variants and prices, then publish.
        </p>
        <ProductWizard categories={categories} initial={draft} startStep={1} />
      </div>
    );
  }

  return (
    <form
      className="mx-auto max-w-2xl rounded-[8px] border border-sand bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await aiDraftFromPhotos(fd);
          if (!res.ok) return void toast.error(res.error);
          const { draft: d, images } = res.data!;
          setDraft({
            ...EMPTY_INITIAL,
            categoryId: d.categoryId ?? "",
            title: d.title,
            description: d.description,
            bullets: [...d.bullets, "", "", "", "", ""].slice(0, 5),
            attributes: d.attributes,
            tags: d.tags,
            media: images.map((url) => ({ url, alt: d.title, type: "IMAGE" as const })),
          });
        });
      }}
    >
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[8px] border-2 border-dashed border-sand bg-sand-50 p-10 text-center hover:border-gold-500">
        <Camera className="size-10 text-gold-text" aria-hidden />
        <span className="font-medium">Choose up to 8 product photos</span>
        <span className="text-xs text-slate">Tip: descriptive file names (e.g. “navy-linen-shirt.jpg”) help the mock AI; a real AI provider reads the images.</span>
        <input
          type="file"
          name="photos"
          multiple
          required
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => setPreviews(Array.from(e.target.files ?? []).slice(0, 8).map((f) => URL.createObjectURL(f)))}
        />
      </label>
      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {previews.map((p, i) => (
            <motion.img key={p} src={p} alt={`Photo ${i + 1}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} className="aspect-square rounded-md object-cover" />
          ))}
        </div>
      )}
      <Field label="Anything the AI should know? (optional)" htmlFor="hint" className="mt-4">
        <Input id="hint" name="hint" maxLength={300} placeholder="e.g. 100% linen shirt, relaxed fit, made in Faisalabad" />
      </Field>
      <Button type="submit" variant="gold" size="lg" className="mt-5 w-full" loading={pending}>
        <Sparkles /> {pending ? "Drafting your listing…" : "Draft my listing"}
      </Button>
    </form>
  );
}

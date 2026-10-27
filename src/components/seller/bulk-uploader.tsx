"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form";
import { startBulkUpload } from "@/server/actions/seller";

export function BulkUploader({ categories }: { categories: { id: string; name: string }[] }) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="grid gap-4 rounded-[8px] border border-sand bg-white p-6 md:grid-cols-2">
      <div className="space-y-3">
        <p className="flex items-center gap-2 font-semibold">
          <span className="grid size-6 place-items-center rounded-full bg-navy-900 text-xs text-white">1</span> Get the template
        </p>
        <Field label="Category" htmlFor="bulk-cat">
          <Select id="bulk-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Button asChild variant="secondary">
          <a href={`/api/seller/bulk-template?categoryId=${categoryId}`} download>
            <Download /> Download CSV template
          </a>
        </Button>
        <p className="text-xs text-slate">One row per variant. Rows sharing a <code>handle</code> become one product. Use <code>|</code> to separate bullets and image URLs.</p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!file) return;
          const fd = new FormData();
          fd.set("file", file);
          fd.set("categoryId", categoryId);
          start(async () => {
            const res = await startBulkUpload(fd);
            if (!res.ok) return void toast.error(res.error);
            toast.success(res.message);
            setFile(null);
            setTimeout(() => router.refresh(), 1500);
          });
        }}
      >
        <p className="flex items-center gap-2 font-semibold">
          <span className="grid size-6 place-items-center rounded-full bg-navy-900 text-xs text-white">2</span> Upload your file
        </p>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border-2 border-dashed border-sand bg-sand-50 p-6 text-center hover:border-gold-500">
          <FileSpreadsheet className="size-8 text-gold-text" aria-hidden />
          <span className="text-sm font-medium">{file ? file.name : "Choose a .csv file"}</span>
          <span className="text-xs text-slate">Up to 10 MB · processed in the background</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <Button type="submit" variant="gold" className="w-full" disabled={!file} loading={pending}>
          <Upload /> Upload and validate
        </Button>
      </form>
    </div>
  );
}

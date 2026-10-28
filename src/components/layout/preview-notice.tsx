import Link from "next/link";
import { db } from "@/lib/db";

/** True while any example (seeded) listing is live, so the notice disappears once the real catalog replaces it. */
export async function catalogInPreview() {
  return !!(await db.product.findFirst({ where: { isSample: true, status: "ACTIVE" }, select: { id: true } }));
}

export async function PreviewNotice() {
  if (!(await catalogInPreview())) return null;
  return (
    <div className="bg-gold-500 text-navy-900">
      <p className="container-page py-2 text-center text-xs font-medium sm:text-sm">
        Marqova opens soon. Listings and stores shown are previews, and orders placed now aren&apos;t shipped or charged.{" "}
        <Link href="/about#preview" className="font-semibold whitespace-nowrap underline underline-offset-2">
          What this means
        </Link>
      </p>
    </div>
  );
}

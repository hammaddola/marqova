import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { requireSeller } from "@/server/session";
import { getWizardCategories, getWizardProduct } from "@/server/seller-data";
import { PageHeader } from "@/components/layout/console-shell";
import { ProductWizard } from "@/components/seller/product-wizard";
import { StatusPill } from "@/components/account/status-pill";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: PageProps<"/seller/listings/[id]">) {
  const { store } = await requireSeller();
  const { id } = await params;
  const [categories, initial, meta] = await Promise.all([
    getWizardCategories(),
    getWizardProduct(store.id, id),
    db.product.findFirst({ where: { id, storeId: store.id }, select: { status: true, slug: true, moderationNote: true } }),
  ]);
  if (!initial || !meta) notFound();
  return (
    <div>
      <PageHeader
        title={initial.title}
        subtitle={meta.moderationNote ?? undefined}
        actions={
          <>
            <StatusPill status={meta.status} />
            {meta.status === "ACTIVE" && (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/p/${meta.slug}`} target="_blank">
                  <ExternalLink /> View in store
                </Link>
              </Button>
            )}
          </>
        }
      />
      <ProductWizard categories={categories} initial={initial} startStep={1} />
    </div>
  );
}

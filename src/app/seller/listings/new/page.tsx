import { requireSeller } from "@/server/session";
import { getWizardCategories } from "@/server/seller-data";
import { PageHeader } from "@/components/layout/console-shell";
import { ProductWizard } from "@/components/seller/product-wizard";

export const metadata = { title: "Add product" };

export default async function NewListingPage() {
  await requireSeller();
  const categories = await getWizardCategories();
  return (
    <div>
      <PageHeader title="Add a product" subtitle="Category → details → variants → media → shipping → preview." />
      <ProductWizard categories={categories} />
    </div>
  );
}

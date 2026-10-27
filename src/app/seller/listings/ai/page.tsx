import { requireSeller } from "@/server/session";
import { getWizardCategories } from "@/server/seller-data";
import { PageHeader } from "@/components/layout/console-shell";
import { AiListing } from "@/components/seller/ai-listing";

export const metadata = { title: "List from a photo" };

export default async function AiListingPage() {
  await requireSeller();
  const categories = await getWizardCategories();
  return (
    <div>
      <PageHeader title="List from a photo" subtitle="Upload photos — AI drafts the title, bullets, description, category, attributes and tags. You review everything before publishing." />
      <AiListing categories={categories} provider={process.env.AI_PROVIDER === "anthropic" && process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock"} />
    </div>
  );
}

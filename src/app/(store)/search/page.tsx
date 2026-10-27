import type { Metadata } from "next";
import { SearchView } from "@/components/search/search-view";
import { parseSearchParams } from "@/lib/search-params";
import { firstParam } from "@/lib/utils";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const q = firstParam((await searchParams).q);
  return {
    title: q ? `Results for “${q.slice(0, 60)}”` : "All products",
    robots: { index: !q, follow: true },
    alternates: { canonical: "/search" },
  };
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const raw = await searchParams;
  const params = parseSearchParams(raw);
  const heading = params.q ? `Results for “${params.q}”` : raw.visual_source === "photo" ? "Similar to your photo" : "All products";
  return (
    <div className="container-page py-8">
      <SearchView params={params} raw={raw} basePath="/search" heading={heading} />
    </div>
  );
}

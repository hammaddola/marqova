import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { SearchView } from "@/components/search/search-view";
import { parseSearchParams } from "@/lib/search-params";
import { categoryWithDescendants } from "@/server/catalog";
import { jsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/c/[category]">): Promise<Metadata> {
  const { category } = await params;
  const cat = await categoryWithDescendants(category);
  if (!cat) return { title: "Category not found" };
  const title = `${cat.node.name} — shop verified sellers`;
  const description = `Shop ${cat.node.name.toLowerCase()} on Marqova: verified sellers, real reviews, full prices with delivery shown upfront.`;
  return { title, description, alternates: { canonical: `/c/${cat.node.slug}` }, openGraph: { title, description, url: `/c/${cat.node.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/c/[category]">) {
  const { category } = await params;
  const raw = await searchParams;
  const cat = await categoryWithDescendants(category);
  if (!cat) notFound();
  const search = parseSearchParams(raw, cat.node.slug);
  const parent = cat.path.length > 1 ? cat.path[cat.path.length - 2] : null;
  const siblings = cat.node.children.length ? cat.node.children : [];

  const categoryLinks = (
    <div className="border-b border-sand pb-4 mb-4">
      <p className="mb-2 text-sm font-semibold">Department</p>
      {parent && (
        <Link href={`/c/${parent.slug}`} className="mb-1 flex items-center gap-1 text-sm text-slate hover:text-gold-text">
          ‹ {parent.name}
        </Link>
      )}
      <p className="text-sm font-semibold text-ink">{cat.node.name}</p>
      <ul className="mt-1 ml-3 space-y-1">
        {siblings.map((s) => (
          <li key={s.slug}>
            <Link href={`/c/${s.slug}`} className="text-sm text-slate hover:text-gold-text">
              {s.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="container-page py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [{ name: "Home", url: siteUrl("/") }, ...cat.path.map((c) => ({ name: c.name, url: siteUrl(`/c/${c.slug}`) }))].map((b, i) => ({ "@type": "ListItem", position: i + 1, name: b.name, item: b.url })),
        })}
      />
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-xs text-slate">
        <Link href="/" className="hover:text-gold-text">Home</Link>
        {cat.path.map((c, i) => (
          <span key={c.slug} className="flex items-center gap-1">
            <ChevronRight className="size-3" aria-hidden />
            {i === cat.path.length - 1 ? <span aria-current="page" className="text-ink">{c.name}</span> : <Link href={`/c/${c.slug}`} className="hover:text-gold-text">{c.name}</Link>}
          </span>
        ))}
      </nav>
      {siblings.length > 0 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {siblings.map((s) => (
            <Link key={s.slug} href={`/c/${s.slug}`} className="shrink-0 rounded-full border border-sand bg-white px-4 py-2 text-sm font-medium transition-colors hover:border-gold-500 hover:bg-gold-100">
              {s.name}
            </Link>
          ))}
        </div>
      )}
      <SearchView params={search} raw={raw} basePath={`/c/${cat.node.slug}`} heading={cat.node.name} categoryId={cat.node.id} categoryLinks={categoryLinks} />
    </div>
  );
}

import type { Metadata } from "next";
import { CompareTable } from "@/components/product/compare-table";

export const metadata: Metadata = { title: "Compare products", robots: { index: false } };

export default function ComparePage() {
  return (
    <div className="container-page py-8">
      <h1 className="heading-display mb-6 text-3xl">Compare products</h1>
      <CompareTable />
    </div>
  );
}

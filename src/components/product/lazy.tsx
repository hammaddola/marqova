"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/primitives";

/**
 * Below-the-fold product widgets are code-split so the buy box hydrates first.
 * Recharts (price history) is the heaviest of these.
 */
export const PriceHistory = dynamic(() => import("./price-history").then((m) => m.PriceHistory), { ssr: false, loading: () => <Skeleton className="h-44" /> });
export const Reviews = dynamic(() => import("./reviews").then((m) => m.Reviews), { loading: () => <Skeleton className="h-96" /> });
export const QA = dynamic(() => import("./qa").then((m) => m.QA), { loading: () => <Skeleton className="h-64" /> });
export const FrequentlyBought = dynamic(() => import("./frequently-bought").then((m) => m.FrequentlyBought), { loading: () => <Skeleton className="h-32" /> });

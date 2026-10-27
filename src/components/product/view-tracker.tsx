"use client";

import { useEffect } from "react";
import { rememberProduct } from "@/components/home/recently-viewed";

export function ViewTracker({ productId }: { productId: string }) {
  useEffect(() => rememberProduct(productId), [productId]);
  return null;
}

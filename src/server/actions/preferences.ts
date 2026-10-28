"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CITIES } from "@/lib/pakistan";

export async function setDeliveryCity(city: string) {
  // Pakistan only: the delivery city must be one we deliver to.
  const clean = CITIES.find((c) => c.toLowerCase() === String(city).trim().toLowerCase());
  if (!clean) return;
  (await cookies()).set("mq_city", clean, { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}

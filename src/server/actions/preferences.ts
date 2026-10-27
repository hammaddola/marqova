"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setDeliveryCity(city: string) {
  const clean = city.replace(/[^a-zA-Z\s-]/g, "").slice(0, 40);
  if (!clean) return;
  (await cookies()).set("mq_city", clean, { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}

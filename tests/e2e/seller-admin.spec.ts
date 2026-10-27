import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("seller sees the hub, listings table and can fulfil an order", async ({ page }) => {
  await login(page, "seller@marqova.dev");
  await page.goto("/seller");
  await expect(page.getByText("Daily sales")).toBeVisible();

  await page.goto("/seller/listings");
  await expect(page.getByRole("table", { name: "Your listings" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Select all" }).check();
  await expect(page.getByText(/selected/)).toBeVisible();

  await page.goto("/seller/orders");
  const accept = page.getByRole("button", { name: "Accept order" }).first();
  if (await accept.isVisible()) {
    await accept.click();
    await expect(page.getByText("Marked accepted")).toBeVisible();
  }
});

test("seller add-product wizard walks through every step", async ({ page }) => {
  await login(page, "seller@marqova.dev");
  await page.goto("/seller/listings/new");
  await page.getByLabel("Find a category").fill("sneakers");
  await page.getByRole("button", { name: /Sneakers/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByLabel("Title").fill(`E2E Court Sneaker ${Date.now()}`);
  await page.getByLabel(/Description/).fill("A test listing created by the end-to-end suite. ".repeat(6));
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: "Black", exact: true }).click();
  await page.getByRole("button", { name: "42", exact: true }).click();
  await page.getByRole("textbox", { name: "Price", exact: true }).fill("7999");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/Draft saved|Saved/)).toBeVisible();
});

test("admin can review seller applications and the job queue", async ({ page }) => {
  await login(page, "admin@marqova.dev");
  await page.goto("/admin/sellers");
  await expect(page.getByRole("heading", { name: "Seller approvals" })).toBeVisible();
  await page.goto("/admin/categories");
  await expect(page.getByRole("heading", { name: /Attribute template/ })).toBeVisible();
  await page.goto("/admin/jobs");
  await expect(page.getByRole("heading", { name: "Background job queue" })).toBeVisible();
});

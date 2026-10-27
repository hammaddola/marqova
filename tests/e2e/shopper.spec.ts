import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("home shows the brand promise, trust strip and categories", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("See it.");
  await expect(page.getByText("Real reviews only").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Fashion/ }).first()).toBeVisible();
});

test("search with filters returns matching products", async ({ page }) => {
  await page.goto("/search?q=shirt");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("shirt");
  await expect(page.locator("article").first()).toBeVisible();
  await page.goto("/c/men-s-clothing?a_size=M&sort=price_asc");
  await expect(page.locator("article").first()).toBeVisible();
});

test("guest can buy with the test payment method and gets a confirmation", async ({ page }) => {
  await page.goto("/search?q=shirt");
  await page.locator("article h3 a").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Total, no hidden fees")).toBeVisible();
  await page.getByRole("button", { name: "Buy Now" }).first().click();
  await page.waitForURL("**/checkout");

  await page.getByLabel("Email for receipt & tracking").fill("guest.e2e@example.com");
  await page.getByLabel("Full name").fill("E2E Guest");
  await page.getByLabel("Phone").fill("+92 300 1234567");
  await page.getByLabel("Street address").fill("House 1, Street 2");
  await page.getByLabel("City").fill("Karachi");
  await page.getByLabel("Province / region").fill("Sindh");
  await page.getByLabel("Postal code").fill("75500");
  await page.getByRole("radio", { name: /Test card/ }).click();
  await page.getByRole("button", { name: /Place order/ }).click();

  await page.waitForURL("**/checkout/confirmation/**");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("order is placed");
  await expect(page.getByText(/Order MQ-/)).toBeVisible();
});

test("shopper sees orders and can open tracking", async ({ page }) => {
  await login(page, "shopper@marqova.dev");
  await page.goto("/account/orders");
  await expect(page.getByRole("heading", { name: "Orders & tracking" })).toBeVisible();
  await page.getByRole("link", { name: "Details & tracking" }).first().click();
  await expect(page.getByRole("list", { name: "Delivery progress" }).first()).toBeVisible();
});

test("try-on studio recommends a size @mobile", async ({ page }) => {
  await page.goto("/try-on");
  await expect(page.getByText("Your avatar")).toBeVisible();
  await expect(page.getByLabel("Recommended").first()).toBeVisible();
  await page.getByRole("radio", { name: "women" }).click();
  await expect(page.getByText(/Size .* (should fit|may feel)/)).toBeVisible();
});

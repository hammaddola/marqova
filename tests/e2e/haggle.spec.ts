import { expect, test } from "@playwright/test";

test("Bhao-Taao: haggle a deal and get it applied in the cart", async ({ page }) => {
  // A fresh account, so the haggle starts from round one on every run.
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Haggle Tester");
  await page.getByLabel("Email").fill(`haggle.${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("Bargain123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/register"));
  await page.goto("/search?q=oxford");
  await page.getByRole("link", { name: /Oxford Button-Down Shirt/ }).first().click();
  await page.getByRole("button", { name: /Bhao-Taao: make an offer/ }).click();

  const dialog = page.getByRole("dialog");
  const log = dialog.getByRole("log");
  await expect(log).toContainText("Make me a fair offer");
  await dialog.getByRole("button", { name: /−10%/ }).click();
  await expect(log.locator("li")).toHaveCount(3);
  await dialog.getByRole("button", { name: /^Deal at/ }).click();
  await expect(dialog.getByText("PAKKA DEAL")).toBeVisible();
  await expect(dialog.getByText(/BHAO-/)).toBeVisible();

  await dialog.getByRole("button", { name: "Add to cart at my price" }).click();
  await page.waitForURL("**/cart");
  await expect(page.getByText(/BHAO-/).first()).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("shopping assistant finds products and answers help questions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open shopping assistant" }).click();
  const panel = page.getByRole("dialog", { name: "Marqova shopping assistant" });

  await panel.getByRole("button", { name: "Navy linen shirt under 6000" }).click();
  await expect(panel.locator('a[href^="/p/"]').first()).toBeVisible();

  await panel.getByLabel("Message").fill("Is cash on delivery available?");
  await panel.getByRole("button", { name: "Send" }).click();
  await expect(panel.getByText("Cash on delivery is available on every order.")).toBeVisible();
});

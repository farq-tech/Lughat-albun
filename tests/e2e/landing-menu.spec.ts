import { expect, test } from "@playwright/test";

test.describe("لغات البن landing + menu smoke", () => {
  test("car QR opens menu directly", async ({ page }) => {
    await page.goto("/order?source=qr");
    await expect(page).toHaveURL(/\/order\/menu\?source=qr/);
    await expect(page.getByText("لغات البن").first()).toBeVisible();
    await expect(page.getByText("آيس لاتيه").first()).toBeVisible();
    await expect(page.getByText("سبانش لاتيه").first()).toBeVisible();
  });

  test("website landing shows mode picker", async ({ page }) => {
    await page.goto("/order");
    await expect(page.getByText("لغات البن").first()).toBeVisible();
    await expect(page.getByText(/قهوتك… بطريقتك/)).toBeVisible();
    await expect(page.getByRole("button", { name: /طلبات الطاولات/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /من السيارة/ })).toBeVisible();

    await page.getByRole("link", { name: /من السيارة/ }).click();
    await expect(page).toHaveURL(/\/order\/menu/);
  });
});

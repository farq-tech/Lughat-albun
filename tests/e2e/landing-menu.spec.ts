import { expect, test } from "@playwright/test";

test.describe("لغات البن landing + menu smoke", () => {
  test("QR landing shows availability and opens menu", async ({ page }) => {
    await page.goto("/order?source=qr");
    await expect(page.getByText("لغات البن").first()).toBeVisible();
    await expect(page.getByText(/قهوتك تجيك/)).toBeVisible();
    await expect(page.getByText(/طلبات السيارة/)).toBeVisible();

    await page.getByRole("link", { name: /ابدأ الطلب/ }).click();
    await expect(page).toHaveURL(/\/order\/menu/);
    await expect(page.getByText("آيس لاتيه").first()).toBeVisible();
    await expect(page.getByText("سبانش لاتيه").first()).toBeVisible();
  });
});

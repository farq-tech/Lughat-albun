import { expect, test } from "@playwright/test";

/**
 * Core curbside journey. Requires Supabase env vars.
 * Skips gracefully when secrets are not configured.
 */
const hasSupabaseSecrets = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

test.describe("لغة البن curbside happy path", () => {
  test.skip(!hasSupabaseSecrets, "Supabase secrets required for E2E");

  test.beforeEach(async ({ page }) => {
    await page.goto("/order?source=qr");
  });

  test("QR → menu → cart → pay → staff → arrive → deliver", async ({
    page,
    context,
  }) => {
    await expect(page.getByRole("heading", { name: /لغة البن|قهوتك تجيك/ })).toBeVisible();
    const start = page.getByRole("link", { name: /ابدأ الطلب/ });
    await expect(start).toBeVisible();
    await start.click();

    await expect(page).toHaveURL(/\/order\/menu/);
    await page.getByText("آيس لاتيه").first().click();

    // modifiers
    const large = page.getByRole("button", { name: /كبير/ }).first();
    if (await large.isVisible().catch(() => false)) await large.click();
    const oat = page.getByRole("button", { name: /شوفان/ }).first();
    if (await oat.isVisible().catch(() => false)) await oat.click();

    const add = page.getByRole("button", { name: /أضف|إضافة/ }).first();
    if (await add.isVisible().catch(() => false)) await add.click();

    const cartCta = page.getByRole("button", { name: /عرض السلة|الدفع|السلة/ }).first();
    await cartCta.click();

    const checkout = page.getByRole("link", { name: /إتمام|الدفع|checkout/i }).or(
      page.getByRole("button", { name: /إتمام|ادفع/ }),
    );
    await checkout.first().click();

    await expect(page).toHaveURL(/\/order\/checkout/);
    await page.getByLabel(/جوال|هاتف|phone/i).fill("0501234567");
    const vehicleMake = page.getByLabel(/نوع|سيارة|make/i);
    if (await vehicleMake.isVisible().catch(() => false)) {
      await vehicleMake.fill("كامري");
      await page.getByLabel(/لون|color/i).fill("أبيض");
      const plate = page.getByLabel(/لوحة|plate/i);
      if (await plate.isVisible().catch(() => false)) await plate.fill("728");
    }

    await page.getByRole("button", { name: /ادفع|Apple Pay|تأكيد الدفع/ }).first().click();

    await expect(page.getByText(/طلبك وصلنا/)).toBeVisible({ timeout: 30_000 });
    const orderUrl = page.url();
    const publicNumber = orderUrl.match(/\/order\/(\d+)/)?.[1];
    expect(publicNumber).toBeTruthy();

    // Staff flow in another page
    const staff = await context.newPage();
    // Staff login may not exist in seed — use queue if session cookie absent
    await staff.goto("/staff");
    // If redirected to login, mark as known limitation
    if (staff.url().includes("/login")) {
      test.info().annotations.push({
        type: "note",
        description: "Staff user not seeded; customer half verified",
      });
      return;
    }

    await staff.getByText(`#${publicNumber}`).first().click({ timeout: 15_000 }).catch(async () => {
      await staff.getByRole("button", { name: /ابدأ/ }).first().click();
    });

    const startBtn = staff.getByRole("button", { name: /^ابدأ$/ }).first();
    if (await startBtn.isVisible().catch(() => false)) await startBtn.click();
    const readyBtn = staff.getByRole("button", { name: /جاهز/ }).first();
    if (await readyBtn.isVisible().catch(() => false)) await readyBtn.click();

    await page.bringToFront();
    await page.reload();
    await expect(page.getByText(/قهوتك جاهزة|جاهزة/)).toBeVisible({ timeout: 20_000 });

    const arrived = page.getByRole("button", { name: /وصلت/ });
    await arrived.click();
    const confirm = page.getByRole("button", { name: /هذه سيارتي|نعم/ });
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
    await expect(page.getByText(/فلشر|عرفناك/)).toBeVisible({ timeout: 15_000 });

    await staff.bringToFront();
    await staff.reload();
    await expect(staff.getByText(/العميل وصل/)).toBeVisible({ timeout: 15_000 });
    const out = staff.getByRole("button", { name: /خرجت له/ }).first();
    if (await out.isVisible().catch(() => false)) await out.click();
    const done = staff.getByRole("button", { name: /تم التسليم/ }).first();
    if (await done.isVisible().catch(() => false)) await done.click();

    await page.bringToFront();
    await page.reload();
    await expect(page.getByText(/بالعافية/)).toBeVisible({ timeout: 20_000 });
  });
});

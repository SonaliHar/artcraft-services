import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/v1/**", (route) =>
    route.fulfill({ json: { success: true, logged_in: false } }),
  );
});

test("reduced motion uses native scrolling on first load", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/download");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/\blenis\b/);
  await expect(page.locator("html")).not.toHaveAttribute("data-intro");
});

test("changing the system preference stops and restores smooth scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/download");
  await expect(page.locator("html")).toHaveClass(/\blenis\b/);
  for (let i = 0; i < 2; i++) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("html")).not.toHaveClass(/\blenis\b/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.locator("html")).toHaveClass(/\blenis\b/);
  }
});

test("enabling motion after a reduced-motion load starts smooth scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/download");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/\blenis\b/);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveClass(/\blenis\b/);
});

import { expect, test } from "@playwright/test";

test("app home renders through the optional catch-all", async ({ page }) => {
  await page.goto("/docs/artcraft");
  await expect(page.getByRole("heading", { level: 1, name: "Fixture ArtCraft" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Docs" }).getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
});

test("a guide renders with sidebar, anchors, table and rewritten links", async ({ page }) => {
  await page.goto("/docs/artcraft/guides/first-guide#step-two");
  await expect(page.getByRole("heading", { level: 1, name: "First guide" })).toBeVisible();
  await expect(page.locator("#step-two")).toBeInViewport();
  await expect(page.locator("article table td", { hasText: "Large" })).toBeVisible();
  await expect(page.getByRole("link", { name: "the broken thing" })).toHaveAttribute("href", "/docs/artcraft/troubleshooting/broken-thing#fix");
  await expect(page.getByText("Checked against v0.9.4")).toBeVisible();
});

test("hostile markup in a page does not run", async ({ page }) => {
  await page.goto("/docs/artcraft/troubleshooting/broken-thing");
  await expect(page.getByRole("heading", { level: 2, name: /Fix/ })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __pwned?: boolean }).__pwned)).toBeUndefined();
  await expect(page.locator("article script, article [onerror], article a[href^='javascript:']")).toHaveCount(0);
});

test("redirect_from sends old URLs to the page", async ({ page }) => {
  await page.goto("/docs/artcraft/old-guide");
  await expect(page).toHaveURL(/\/docs\/artcraft\/guides\/first-guide$/);
});

test("generated model table is filled in", async ({ page }) => {
  await page.goto("/docs/artcraft/reference/models");
  await expect(page.locator("article td", { hasText: "Fixture Model" })).toBeVisible();
});

test("search finds a page by a heading word", async ({ page }) => {
  await page.goto("/docs");
  await page.getByLabel("Search the docs").fill("step");
  await expect(page.getByRole("list", { name: "Search results" }).getByRole("link", { name: /First guide/ })).toBeVisible();
});

test("machine outputs", async ({ request }) => {
  const raw = await request.get("/docs/artcraft/guides/first-guide.md");
  expect(raw.status()).toBe(200);
  expect(raw.headers()["content-type"]).toContain("text/markdown");
  expect(await raw.text()).toContain("## Step two");

  const llms = await (await request.get("/llms.txt")).text();
  expect(llms).toContain("/docs/artcraft/guides/first-guide.md): A fixture guide.");

  const full = await (await request.get("/docs/artcraft/llms-full.txt")).text();
  expect(full).toContain("| Fixture Model |");

  const skill = await (await request.get("/docs/agents/support.md")).text();
  expect(skill).toContain("name: craft-docs-support");
});

test("table of contents lists the sections and follows scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/docs/artcraft/guides/first-guide");
  const toc = page.getByRole("navigation", { name: "On this page" });
  await expect(toc.getByRole("link", { name: "Step one" })).toBeVisible();
  await page.locator("#step-two").scrollIntoViewIfNeeded();
  await expect(toc.getByRole("link", { name: "Step two" })).toHaveAttribute("aria-current", "location");
});

test("previous and next links follow the sidebar order", async ({ page }) => {
  await page.goto("/docs/artcraft/guides/first-guide");
  await expect(page.getByRole("link", { name: /Previous.*Guides/ })).toHaveAttribute("href", "/docs/artcraft/guides");
  await expect(page.getByRole("link", { name: /Next.*Models/ })).toHaveAttribute("href", "/docs/artcraft/reference/models");
});

test("breadcrumbs show where the page sits", async ({ page }) => {
  await page.goto("/docs/artcraft/troubleshooting/broken-thing");
  const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "/docs");
  await expect(crumbs.getByRole("link", { name: "ArtCraft" })).toHaveAttribute("href", "/docs/artcraft");
});

test("mobile menu works and shows the current section", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/artcraft/guides/first-guide");
  const menu = page.locator("details", { hasText: "Menu" });
  await expect(menu.getByRole("link", { name: "First guide" })).toBeHidden();
  await menu.locator("summary").click();
  await expect(menu.getByRole("link", { name: "First guide" })).toHaveAttribute("aria-current", "page");
});

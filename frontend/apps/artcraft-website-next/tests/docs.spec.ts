import { expect, test } from "@playwright/test";

test("app home renders through the optional catch-all", async ({ page }) => {
  await page.goto("/docs/artcraft");
  await expect(page.getByRole("heading", { level: 1, name: "Fixture ArtCraft" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Docs" }).getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
});

test("a Craft app's docs carry its icon and color", async ({ page }) => {
  await page.goto("/docs/photocraft");
  await expect(page.getByRole("heading", { level: 1, name: "Fixture PhotoCraft" })).toBeVisible();
  const header = page.getByRole("link", { name: "PhotoCraft Docs" });
  const icon = header.locator('img[src*="/images/apps/photocraft/icon.webp"]');
  await expect(icon).toBeVisible();
  await expect(icon).toHaveAttribute("alt", "");
  await expect(icon).toHaveAttribute("width", /\d+/);
  await expect(icon).toHaveAttribute("height", /\d+/);
  await expect(page.locator("div.app-photocraft").filter({ has: page.getByRole("heading", { level: 1 }) })).toHaveCount(1);
});

test("ArtCraft keeps its mark and the site blue", async ({ page }) => {
  await page.goto("/docs/artcraft");
  await expect(page.getByRole("link", { name: "ArtCraft Docs" }).locator('img[src="/artcraft-icon.svg"]')).toBeVisible();
  const craftThemes = ["photocraft", "vectorcraft", "filmcraft", "lightcraft", "pdfcraft", "effectcraft", "designcraft", "wordcraft", "soundcraft", "deckcraft", "cadcraft", "gridcraft"]
    .map((slug) => `[class~="app-${slug}"]`)
    .join(", ");
  await expect(page.locator(craftThemes)).toHaveCount(0);
});

test("common fixes are grouped by app, skip help pages and link the whole folder", async ({ page }) => {
  await page.goto("/docs");
  const group = page.getByRole("listitem").filter({ has: page.getByRole("heading", { level: 2, name: "ArtCraft" }) });
  await expect(group.getByRole("link", { name: "Broken thing" })).toHaveAttribute("href", "/docs/artcraft/troubleshooting/broken-thing");
  await expect(group.getByRole("link", { name: "All ArtCraft troubleshooting" })).toHaveAttribute("href", "/docs/artcraft/troubleshooting");
  // PhotoCraft's only troubleshooting page is a generic help page, so it has no group.
  await expect(page.getByRole("heading", { level: 2, name: "PhotoCraft" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Get help with a problem" })).toHaveCount(0);
});

test("docs home has one card per app with its icon and no monograms", async ({ page }) => {
  await page.goto("/docs");
  const cards = page.getByRole("list").filter({ has: page.getByRole("link", { name: /^PhotoCraft/ }) });
  await expect(cards.getByRole("link", { name: /^ArtCraft/ }).locator('img[src="/artcraft-icon.svg"]')).toBeVisible();
  await expect(cards.getByRole("link", { name: /^PhotoCraft/ }).locator('img[src*="/images/apps/photocraft/icon.webp"]')).toBeVisible();
  // The launcher has no fixture, so it is simply absent.
  await expect(page.getByRole("link", { name: /^ArtCraft Launcher/ })).toHaveCount(0);
  await expect(page.locator("[data-monogram]")).toHaveCount(0);
});

test("docs content keeps clear of the scroll ruler between 1024 and 1320px", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/docs");
  await expect(page.locator("html[data-ruler]")).toHaveCount(1);
  const { side, rail } = await page.evaluate(() => ({
    side: document.documentElement.dataset.rulerSide,
    rail: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ruler-rail")),
  }));
  const viewport = 1100;
  for (const label of await page.getByText(/^\d+ pages$/).all()) {
    const box = (await label.boundingBox())!;
    if (side === "right") expect(box.x + box.width).toBeLessThanOrEqual(viewport - rail);
    else expect(box.x).toBeGreaterThanOrEqual(rail);
  }
});

test("the phone menu shows the app's icon", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/photocraft");
  await expect(page.locator("details summary").filter({ hasText: "Menu" }).locator('img[src*="/images/apps/photocraft/icon.webp"]')).toBeVisible();
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
  await page.getByRole("combobox", { name: "Search the docs" }).fill("step");
  const result = page.getByRole("listbox", { name: "Search results" }).getByRole("option", { name: /First guide/ });
  await expect(result).toBeVisible();
  await expect(result.getByRole("link")).toHaveAttribute("href", "/docs/artcraft/guides/first-guide#step-one");
  await expect(result.locator("mark", { hasText: /^Step$/ }).first()).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /\d+ results?/ })).toBeAttached();
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

test("slash focuses search; arrows and Enter open a result at its section", async ({ page }) => {
  await page.goto("/docs/artcraft/troubleshooting/broken-thing");
  await page.keyboard.press("/");
  await expect(page.getByRole("combobox", { name: "Search the docs" })).toBeFocused();
  await page.keyboard.type("step two");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/docs\/artcraft\/guides\/first-guide#step-two$/);
});

test("heading anchors copy the full section URL", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs/artcraft/guides/first-guide");
  await page.locator("#step-two").hover();
  await page.locator("#step-two .heading-anchor").click();
  await expect(page.getByText("Link copied")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/docs\/artcraft\/guides\/first-guide#step-two$/);
});

test("code blocks have a copy button", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs/artcraft/guides/first-guide");
  await page.locator("article pre").hover();
  await page.getByRole("button", { name: "Copy code" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("echo hi\n");
});

test("page actions copy the page link and its Markdown", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs/artcraft/guides/first-guide");
  await page.getByRole("button", { name: "Copy link" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("https://getartcraft.com/docs/artcraft/guides/first-guide");
  await page.getByRole("button", { name: "Copy as Markdown" }).click();
  await expect(page.getByRole("button", { name: "Markdown copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("## Step two");
});

test("heading anchors say so when there is no clipboard", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: undefined }));
  await page.goto("/docs/artcraft/guides/first-guide");
  await page.locator("#step-two").hover();
  await page.locator("#step-two .heading-anchor").click();
  await expect(page.getByText("Copy blocked, use the address bar")).toBeVisible();
  await expect(page).toHaveURL(/#step-two$/);
  expect(errors).toEqual([]);
});

test("Copy as Markdown reports a failed download", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.route("**/first-guide.md", (route) => route.fulfill({ status: 500, body: "" }));
  await page.goto("/docs/artcraft/guides/first-guide");
  await page.getByRole("button", { name: "Copy as Markdown" }).click();
  await expect(page.getByRole("button", { name: "Copy failed" })).toBeVisible();
});

test("without JavaScript the page offers the Markdown as a link", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/docs/artcraft/guides/first-guide");
  await expect(page.getByRole("link", { name: "View Markdown" })).toHaveAttribute("href", "/docs/artcraft/guides/first-guide.md");
  await expect(page.getByRole("button", { name: "Copy link" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Copy as Markdown" })).toBeHidden();
  await context.close();
});

test("Ctrl+K focuses search, Escape clears it and typing in a field is left alone", async ({ page }) => {
  await page.goto("/docs/artcraft/guides/first-guide");
  const search = page.getByRole("combobox", { name: "Search the docs" });
  await page.keyboard.press("Control+k");
  await expect(search).toBeFocused();
  await page.keyboard.type("guide/");
  await expect(search).toHaveValue("guide/");
  await expect(search).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(search).toHaveValue("");
  await expect(search).not.toBeFocused();
});

test("on phones slash opens the menu and focuses its search", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/artcraft/guides/first-guide");
  await page.keyboard.press("/");
  const search = page.getByRole("combobox", { name: "Search the docs" });
  await expect(search).toBeFocused();
  await page.keyboard.type("models");
  await expect(page.getByRole("option", { name: /Models/ })).toBeVisible();
});

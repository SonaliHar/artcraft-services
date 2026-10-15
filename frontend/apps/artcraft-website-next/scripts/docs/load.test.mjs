import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { docsRedirects, loadDocApps, loadGenerated } from "./load.mjs";

const SOURCES = [
  { slug: "artcraft", name: "ArtCraft", repo: "storytold/artcraft", branch: "main", path: "docs/user" },
  { slug: "nothing-yet", name: "Nothing", repo: "storytold/nothing", branch: "main", path: "docs/user" },
];

function cache() {
  const dir = mkdtempSync(join(tmpdir(), "craft-load-"));
  mkdirSync(join(dir, "artcraft/guides"), { recursive: true });
  mkdirSync(join(dir, "_generated"), { recursive: true });
  writeFileSync(join(dir, "artcraft/.source.json"), JSON.stringify({ sha: "b".repeat(40), fetchedAt: "2026-10-12T00:00:00Z" }));
  writeFileSync(join(dir, "artcraft/index.md"), "---\ntitle: Home\ndescription: Start.\n---\n## Hi\n");
  writeFileSync(join(dir, "artcraft/guides/a.md"), "---\ntitle: A\ndescription: Guide A.\norder: 5\nverified: 0.9.4\nredirect_from: [/old-a/, older]\n---\n## A\n");
  writeFileSync(join(dir, "_generated/artcraft-models.md"), "| M |");
  return dir;
}

test("loads apps that have a good copy and normalizes pages", () => {
  const [app, ...rest] = loadDocApps(cache(), SOURCES);
  assert.equal(rest.length, 0, "sources without .source.json are left out");
  assert.equal(app.name, "ArtCraft");
  assert.equal(app.sha, "b".repeat(40));
  const a = app.pages.find((p) => p.file === "guides/a.md");
  assert.deepEqual(
    { urlPath: a.urlPath, order: a.order, verified: a.verified, redirectFrom: a.redirectFrom },
    { urlPath: "guides/a", order: 5, verified: "0.9.4", redirectFrom: ["old-a", "older"] },
  );
  const home = app.pages.find((p) => p.file === "index.md");
  assert.equal(home.order, 100);
  assert.equal(home.verified, null);
});

test("loads generated content and builds redirects", () => {
  const dir = cache();
  assert.deepEqual(loadGenerated(dir), { "artcraft-models": "| M |" });
  assert.deepEqual(docsRedirects(loadDocApps(dir, SOURCES)), [
    { source: "/docs/artcraft/old-a", destination: "/docs/artcraft/guides/a", permanent: true },
    { source: "/docs/artcraft/older", destination: "/docs/artcraft/guides/a", permanent: true },
  ]);
  assert.deepEqual(loadGenerated(join(dir, "missing")), {});
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNav, flattenNav } from "./nav.mjs";

const p = (file, urlPath, title, order = 100) => ({ file, urlPath, title, order });

test("builds a sorted folder tree with Overview first", () => {
  const nav = buildNav({
    slug: "artcraft",
    name: "ArtCraft",
    pages: [
      p("index.md", "", "ArtCraft docs", 0),
      p("troubleshooting/b.md", "troubleshooting/b", "Bravo"),
      p("troubleshooting/a.md", "troubleshooting/a", "Alpha"),
      p("getting-started/index.md", "getting-started", "Getting started", 10),
      p("getting-started/install.md", "getting-started/install", "Install", 1),
      p("reference/models.md", "reference/models", "Models"),
    ],
  });
  assert.deepEqual(nav.map((n) => n.title), ["Overview", "Getting started", "Reference", "Troubleshooting"]);
  assert.equal(nav[0].href, "/docs/artcraft");
  assert.equal(nav[1].href, "/docs/artcraft/getting-started");
  assert.equal(nav[2].href, undefined, "folders without index.md are labels");
  assert.deepEqual(nav[3].children.map((n) => n.title), ["Alpha", "Bravo"]);
  assert.equal(nav[1].children[0].href, "/docs/artcraft/getting-started/install");
  assert.deepEqual(flattenNav(nav).map((n) => n.title), ["Overview", "Getting started", "Install", "Models", "Alpha", "Bravo"]);
});

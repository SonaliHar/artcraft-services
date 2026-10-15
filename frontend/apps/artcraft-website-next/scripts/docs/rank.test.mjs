import { test } from "node:test";
import assert from "node:assert/strict";
import { rankEntries } from "./rank.mjs";

const e = (title, description = "", headings = []) => ({
  app: "ArtCraft", title, description, headings,
  headingIds: headings.map((h) => h.toLowerCase().replace(/\s+/g, "-")), href: `/${title}`,
});
const entries = [e("Install on Linux", "Run ArtCraft on Linux."), e("Wayland crash", "Linux crash on launch.", ["Fix it"]), e("Credits")];

test("every word must match; title matches rank first", () => {
  assert.deepEqual(rankEntries(entries, "linux").map((x) => x.entry.title), ["Install on Linux", "Wayland crash"]);
  assert.deepEqual(rankEntries(entries, "  "), []);
  assert.deepEqual(rankEntries(entries, "CREDITS").map((x) => x.entry.title), ["Credits"]);
});

test("a heading match carries that heading's anchor", () => {
  const [hit] = rankEntries(entries, "linux fix");
  assert.equal(hit.entry.title, "Wayland crash");
  assert.equal(hit.anchor, "fix-it");
  assert.equal(rankEntries(entries, "credits")[0].anchor, null);
});

test("the anchor is the heading holding the most query words, first on ties", () => {
  const page = e("Setup", "", ["Install the app", "Install the model files", "Model files"]);
  assert.equal(rankEntries([page], "model files")[0].anchor, "install-the-model-files");
  assert.equal(rankEntries([page], "install")[0].anchor, "install-the-app");
});

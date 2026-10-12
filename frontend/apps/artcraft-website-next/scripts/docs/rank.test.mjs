import { test } from "node:test";
import assert from "node:assert/strict";
import { rankEntries } from "./rank.mjs";

const e = (title, description = "", headings = []) => ({ app: "ArtCraft", title, description, headings, href: `/${title}` });
const entries = [e("Install on Linux", "Run ArtCraft on Linux."), e("Wayland crash", "Linux crash on launch.", ["Fix"]), e("Credits")];

test("every word must match; title matches rank first", () => {
  assert.deepEqual(rankEntries(entries, "linux").map((x) => x.title), ["Install on Linux", "Wayland crash"]);
  assert.deepEqual(rankEntries(entries, "linux fix").map((x) => x.title), ["Wayland crash"]);
  assert.deepEqual(rankEntries(entries, "  "), []);
  assert.deepEqual(rankEntries(entries, "CREDITS").map((x) => x.title), ["Credits"]);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { isAbsolute } from "node:path";
import { DOC_SOURCES, RESERVED_SLUGS, docsCacheDir } from "./sources.mjs";

test("sources have unique kebab slugs that do not collide with /docs routes", () => {
  const slugs = DOC_SOURCES.map((s) => s.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const s of DOC_SOURCES) {
    assert.match(s.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!RESERVED_SLUGS.has(s.slug), `${s.slug} is reserved`);
    assert.match(s.repo, /^[\w.-]+\/[\w.-]+$/);
    assert.ok(s.name && s.branch && s.path);
  }
});

test("cache dir is absolute and honours DOCS_CACHE_DIR", () => {
  assert.ok(isAbsolute(docsCacheDir()));
  process.env.DOCS_CACHE_DIR = "tmp/x";
  assert.ok(docsCacheDir().endsWith("tmp/x") || docsCacheDir().endsWith("tmp\\x"));
  delete process.env.DOCS_CACHE_DIR;
});

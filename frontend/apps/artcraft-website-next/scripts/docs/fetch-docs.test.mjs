import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchAll } from "./fetch-docs.mjs";

const SOURCE = { slug: "artcraft", name: "ArtCraft", repo: "storytold/artcraft", branch: "main", path: "docs/user" };
const SHA = "a".repeat(40);
const RAW = `https://raw.githubusercontent.com/storytold/artcraft/${SHA}/`;
const quiet = { warn: () => {}, log: () => {} };
const page = (title) => `---\ntitle: ${title}\ndescription: About ${title}.\n---\n## Hi\n`;

// Fakes the three GitHub endpoints fetch-docs uses plus the model listing.
// `files` maps repo paths to { content, mode?, type? }.
function fakeGitHub(files, { truncated = false } = {}) {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    if (url === "https://api.github.com/repos/storytold/artcraft/commits/main") return new Response(SHA);
    if (url === `https://api.github.com/repos/storytold/artcraft/git/trees/${SHA}?recursive=1`) {
      return Response.json({
        truncated,
        tree: Object.entries(files).map(([path, f]) => ({ path, mode: f.mode ?? "100644", type: f.type ?? "blob" })),
      });
    }
    if (url.startsWith(RAW)) {
      const file = files[decodeURIComponent(url.slice(RAW.length))];
      return file ? new Response(file.content) : new Response("missing", { status: 404 });
    }
    if (url.startsWith("https://api.storyteller.ai/")) {
      return Response.json({ success: true, models: [{ model: "m", full_name: "Model M" }] });
    }
    throw new Error(`unexpected request ${url}`);
  };
  return { fetchImpl, requested };
}

const run = (cacheDir, fetchImpl, log = quiet) => fetchAll({ sources: [SOURCE], cacheDir, fetchImpl, log });

test("downloads only docs/user Markdown at one commit, skipping links and submodules", async () => {
  const { fetchImpl, requested } = fakeGitHub({
    "README.md": { content: "repo readme" },
    "docs/internal.md": { content: "private" },
    "docs/user": { type: "tree", mode: "040000" },
    "docs/user/index.md": { content: page("Home") },
    "docs/user/guides/a.md": { content: page("A") },
    "docs/user/images/shot.png": { content: "PNGDATA" },
    "docs/user/evil.md": { content: "/etc/passwd", mode: "120000" },
    "docs/user/vendor": { type: "commit", mode: "160000" },
  });
  const cache = mkdtempSync(join(tmpdir(), "craft-cache-"));
  const summary = await run(cache, fetchImpl);
  assert.equal(summary.artcraft, "updated");
  assert.equal(summary["generated:artcraft-models"], "updated");
  assert.match(readFileSync(join(cache, "artcraft/guides/a.md"), "utf8"), /title: A/);
  assert.equal(readFileSync(join(cache, "artcraft/images/shot.png"), "utf8"), "", "assets are placeholders");
  assert.ok(!existsSync(join(cache, "artcraft/README.md")));
  assert.ok(!existsSync(join(cache, "artcraft/internal.md")));
  assert.ok(!existsSync(join(cache, "artcraft/evil.md")), "symlinks are never downloaded");
  assert.ok(!existsSync(join(cache, "artcraft/vendor")), "submodules are skipped");
  assert.ok(!requested.some((u) => u.endsWith("shot.png")), "assets are not downloaded");
  assert.equal(JSON.parse(readFileSync(join(cache, "artcraft/.source.json"), "utf8")).sha, SHA);
  assert.match(readFileSync(join(cache, "_generated/artcraft-models.md"), "utf8"), /Model M/);
});

test("keeps the last good copy when GitHub fails, the tree is truncated, or the new docs are invalid", async () => {
  const cache = mkdtempSync(join(tmpdir(), "craft-cache-"));
  await run(cache, fakeGitHub({ "docs/user/index.md": { content: page("Good") } }).fetchImpl);

  const offline = await run(cache, async () => { throw new Error("offline"); });
  assert.equal(offline.artcraft, "kept");
  assert.equal(offline["generated:artcraft-models"], "kept");

  const truncated = await run(cache, fakeGitHub({ "docs/user/index.md": { content: page("New") } }, { truncated: true }).fetchImpl);
  assert.equal(truncated.artcraft, "kept");

  const invalid = await run(cache, fakeGitHub({ "docs/user/index.md": { content: "---\ntitle: Bad\n---\n" } }).fetchImpl);
  assert.equal(invalid.artcraft, "kept");

  assert.match(readFileSync(join(cache, "artcraft/index.md"), "utf8"), /Good/);
  assert.ok(!existsSync(join(cache, ".tmp-artcraft")));
});

// A request that never answers, except by honouring its abort signal.
const hanging = (url, init = {}) =>
  new Promise((_resolve, reject) => {
    if (!init.signal) return; // no signal: hangs forever and the test times out
    init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
  });

test("a hung request is aborted and the source keeps its last good copy", { timeout: 5_000 }, async () => {
  const cache = mkdtempSync(join(tmpdir(), "craft-cache-"));
  await run(cache, fakeGitHub({ "docs/user/index.md": { content: page("Good") } }).fetchImpl);
  const warnings = [];
  const summary = await fetchAll({
    sources: [SOURCE],
    cacheDir: cache,
    fetchImpl: hanging,
    timeoutMs: 50,
    log: { warn: (m) => warnings.push(m), log: () => {} },
  });
  assert.equal(summary.artcraft, "kept");
  assert.equal(summary["generated:artcraft-models"], "kept");
  assert.match(warnings.join("\n"), /artcraft: .*(timed out|aborted|timeout)/i);
  assert.match(readFileSync(join(cache, "artcraft/index.md"), "utf8"), /Good/);
});

test("every request carries a timeout signal", async () => {
  const cache = mkdtempSync(join(tmpdir(), "craft-cache-"));
  const { fetchImpl } = fakeGitHub({ "docs/user/index.md": { content: page("Good") } });
  const unsignalled = [];
  await fetchAll({
    sources: [SOURCE],
    cacheDir: cache,
    fetchImpl: (url, init = {}) => {
      if (!(init.signal instanceof AbortSignal)) unsignalled.push(url);
      return fetchImpl(url, init);
    },
    log: quiet,
  });
  assert.deepEqual(unsignalled, []);
});

test("a rate-limited GitHub answer says to set GITHUB_TOKEN", async () => {
  const cache = mkdtempSync(join(tmpdir(), "craft-cache-"));
  const warnings = [];
  await fetchAll({
    sources: [SOURCE],
    cacheDir: cache,
    fetchImpl: async () => new Response("rate limit", { status: 403, headers: { "x-ratelimit-remaining": "0" } }),
    log: { warn: (m) => warnings.push(m), log: () => {} },
  });
  const joined = warnings.join("\n");
  assert.match(joined, /HTTP 403/);
  assert.match(joined, /x-ratelimit-remaining: 0/);
  assert.match(joined, /rate limited — set GITHUB_TOKEN/);
});

test("a repo without docs/user is left out without failing", async () => {
  const cache = mkdtempSync(join(tmpdir(), "craft-cache-"));
  const warnings = [];
  const summary = await run(cache, fakeGitHub({ "README.md": { content: "no docs yet" } }).fetchImpl, {
    warn: (m) => warnings.push(m),
    log: () => {},
  });
  assert.equal(summary.artcraft, "missing");
  assert.ok(!existsSync(join(cache, "artcraft")));
  assert.match(warnings.join("\n"), /index\.md: missing/);
});

test("local folders override chosen sources while others still download", async () => {
  const local = mkdtempSync(join(tmpdir(), "craft-local-"));
  writeFileSync(join(local, "index.md"), page("Local"));
  const other = { ...SOURCE, slug: "other", repo: "storytold/other" };
  const cache = mkdtempSync(join(tmpdir(), "craft-cache-"));
  const { fetchImpl, requested } = fakeGitHub({ "docs/user/index.md": { content: page("Remote") } });
  const summary = await fetchAll({ sources: [SOURCE, other], cacheDir: cache, localDirs: { artcraft: local }, fetchImpl, log: quiet });
  assert.equal(summary.artcraft, "updated");
  assert.match(readFileSync(join(cache, "artcraft/index.md"), "utf8"), /Local/);
  assert.equal(JSON.parse(readFileSync(join(cache, "artcraft/.source.json"), "utf8")).local, true);
  assert.ok(!requested.some((u) => u.includes("storytold/artcraft/")), "a local source is not downloaded");
  assert.ok(requested.some((u) => u.includes("storytold/other/")), "other sources still download");
  assert.equal(summary.other, "missing");
});

test("fixture mode copies local folders instead of downloading", async () => {
  const fixtures = mkdtempSync(join(tmpdir(), "craft-fixtures-"));
  mkdirSync(join(fixtures, "artcraft"), { recursive: true });
  mkdirSync(join(fixtures, "_generated"), { recursive: true });
  writeFileSync(join(fixtures, "artcraft/index.md"), page("Fixture"));
  writeFileSync(join(fixtures, "_generated/artcraft-models.md"), "| Fixture Model |");
  const cache = mkdtempSync(join(tmpdir(), "craft-cache-"));
  const summary = await fetchAll({
    sources: [SOURCE], cacheDir: cache, fixtureDir: fixtures, log: quiet,
    fetchImpl: async () => { throw new Error("must not fetch"); },
  });
  assert.equal(summary.artcraft, "updated");
  assert.equal(JSON.parse(readFileSync(join(cache, "artcraft/.source.json"), "utf8")).sha, null);
  assert.equal(readFileSync(join(cache, "_generated/artcraft-models.md"), "utf8"), "| Fixture Model |");
});

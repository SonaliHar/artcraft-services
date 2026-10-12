// Runs before `next dev` / `next build` (npm pre-scripts). Copies each source
// repo's docs folder into the build cache at its current commit, validates it
// with the same checker the app repos run, and keeps the last good copy when
// anything goes wrong. A broken or unreachable app repo never fails the
// website build.
//
// Uses the git trees API instead of tarballs: storytold/artcraft is >1 GB.
// Two GitHub API calls per source; set GITHUB_TOKEN (read-only) in Netlify so
// shared build IPs do not hit the 60/hour unauthenticated limit.
//
// Env: DOCS_CACHE_DIR (default .next/cache/craft-docs, which the Netlify Next
// runtime keeps between builds), DOCS_FIXTURE_DIR (copy local folders instead
// of downloading; used by Playwright), DOCS_LOCAL_SOURCES=slug=path,slug=path
// (preview local docs folders for those apps; others still download),
// DOCS_SKIP_FETCH=1 (use the cache as-is), GITHUB_TOKEN (optional).

import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { collectPages, validatePages } from "./core.mjs";
import { GENERATORS } from "./generated.mjs";
import { DOC_SOURCES, docsCacheDir } from "./sources.mjs";

const PLAIN_FILE_MODES = new Set(["100644", "100755"]);

function githubHeaders(accept) {
  const headers = { accept, "user-agent": "craft-docs-fetch" };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function download(source, dest, fetchImpl) {
  const api = `https://api.github.com/repos/${source.repo}`;
  const commit = await fetchImpl(`${api}/commits/${source.branch}`, { headers: githubHeaders("application/vnd.github.sha") });
  if (!commit.ok) throw new Error(`commit lookup failed: HTTP ${commit.status}`);
  const sha = (await commit.text()).trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("commit lookup returned no sha");

  const treeRes = await fetchImpl(`${api}/git/trees/${sha}?recursive=1`, { headers: githubHeaders("application/vnd.github+json") });
  if (!treeRes.ok) throw new Error(`file listing failed: HTTP ${treeRes.status}`);
  const tree = await treeRes.json();
  if (tree.truncated) throw new Error("file listing was truncated by GitHub");

  // Plain files only: symlinks (120000) and submodules (160000) are skipped,
  // so nothing outside the docs folder can ever be published.
  const prefix = `${source.path}/`;
  const files = tree.tree.filter((e) => e.type === "blob" && PLAIN_FILE_MODES.has(e.mode) && e.path.startsWith(prefix));
  mkdirSync(dest, { recursive: true });
  for (const entry of files) {
    const rel = entry.path.slice(prefix.length);
    const out = join(dest, ...rel.split("/"));
    mkdirSync(dirname(out), { recursive: true });
    // Images and other assets are served from raw.githubusercontent.com by
    // the renderer; the cache only needs to know they exist.
    if (!rel.endsWith(".md")) {
      writeFileSync(out, "");
      continue;
    }
    const url = `https://raw.githubusercontent.com/${source.repo}/${sha}/${entry.path.split("/").map(encodeURIComponent).join("/")}`;
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`download of ${entry.path} failed: HTTP ${res.status}`);
    writeFileSync(out, await res.text());
  }
  return sha;
}

export async function fetchAll({ sources = DOC_SOURCES, cacheDir = docsCacheDir(), fetchImpl = fetch, fixtureDir, localDirs = {}, log = console } = {}) {
  mkdirSync(cacheDir, { recursive: true });
  const summary = {};

  for (const source of sources) {
    const tmp = join(cacheDir, `.tmp-${source.slug}`);
    const dest = join(cacheDir, source.slug);
    const localDir = localDirs[source.slug];
    rmSync(tmp, { recursive: true, force: true });
    try {
      let sha = null;
      if (localDir || fixtureDir) {
        const from = localDir ?? join(fixtureDir, source.slug);
        if (!existsSync(from)) throw new Error(`no local folder at ${from}`);
        cpSync(from, tmp, { recursive: true });
      } else {
        sha = await download(source, tmp, fetchImpl);
      }
      const { errors, warnings } = validatePages(collectPages(tmp));
      for (const warning of warnings) log.warn(`[docs] ${source.slug}: ${warning}`);
      if (errors.length) throw new Error(`${errors.length} validation error(s):\n  ${errors.join("\n  ")}`);
      writeFileSync(join(tmp, ".source.json"), JSON.stringify({ ...source, sha, local: Boolean(localDir), fetchedAt: new Date().toISOString() }, null, 2));
      rmSync(dest, { recursive: true, force: true });
      renameSync(tmp, dest);
      summary[source.slug] = "updated";
    } catch (err) {
      rmSync(tmp, { recursive: true, force: true });
      const kept = existsSync(join(dest, ".source.json"));
      log.warn(`[docs] ${source.slug}: ${err.message}\n  → ${kept ? "keeping the last good copy" : "no good copy yet, leaving this app out"}`);
      summary[source.slug] = kept ? "kept" : "missing";
    }
  }

  const generatedDir = join(cacheDir, "_generated");
  mkdirSync(generatedDir, { recursive: true });
  for (const [id, generate] of Object.entries(GENERATORS)) {
    const out = join(generatedDir, `${id}.md`);
    try {
      const markdown = fixtureDir
        ? readFileSync(join(fixtureDir, "_generated", `${id}.md`), "utf8")
        : await generate(fetchImpl);
      writeFileSync(out, markdown);
      summary[`generated:${id}`] = "updated";
    } catch (err) {
      const kept = existsSync(out);
      log.warn(`[docs] generated:${id}: ${err.message} → ${kept ? "keeping the last good copy" : "leaving the marker unfilled"}`);
      summary[`generated:${id}`] = kept ? "kept" : "missing";
    }
  }
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.DOCS_SKIP_FETCH === "1") {
    console.log("[docs] DOCS_SKIP_FETCH=1, using the cache as-is");
  } else {
    const localDirs = Object.fromEntries(
      (process.env.DOCS_LOCAL_SOURCES || "")
        .split(",")
        .filter((pair) => pair.includes("="))
        .map((pair) => [pair.slice(0, pair.indexOf("=")).trim(), resolve(pair.slice(pair.indexOf("=") + 1).trim())]),
    );
    const summary = await fetchAll({ fixtureDir: process.env.DOCS_FIXTURE_DIR || undefined, localDirs });
    console.log(`[docs] ${JSON.stringify(summary)}`);
  }
}

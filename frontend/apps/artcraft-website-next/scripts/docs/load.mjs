// Reads the docs cache written by fetch-docs.mjs. Used by the Next pages
// (via src/lib/docs.ts) and by next.config.ts for redirects, so: no
// top-level await.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { collectPages, docHref } from "./core.mjs";

const DEFAULT_ORDER = 100;

export function loadDocApps(cacheDir, sources) {
  return sources.flatMap((source) => {
    const dir = join(cacheDir, source.slug);
    const metaFile = join(dir, ".source.json");
    if (!existsSync(metaFile)) return [];
    const meta = JSON.parse(readFileSync(metaFile, "utf8"));
    const pages = collectPages(dir).pages.map((p) => ({
      file: p.file,
      urlPath: p.urlPath,
      title: String(p.data.title),
      description: String(p.data.description),
      order: p.data.order === undefined ? DEFAULT_ORDER : Number(p.data.order),
      verified: p.data.verified ? String(p.data.verified) : null,
      redirectFrom: [].concat(p.data.redirect_from ?? [])
        .map((r) => String(r).replace(/^\/+|\/+$/g, ""))
        .filter(Boolean),
      body: p.body,
    }));
    return [{ ...source, sha: meta.sha ?? null, fetchedAt: meta.fetchedAt ?? null, pages }];
  });
}

export function loadGenerated(cacheDir) {
  const dir = join(cacheDir, "_generated");
  if (!existsSync(dir)) return {};
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => [f.slice(0, -3), readFileSync(join(dir, f), "utf8")]),
  );
}

export function docsRedirects(apps) {
  return apps.flatMap((app) =>
    app.pages.flatMap((page) =>
      page.redirectFrom.map((from) => ({
        source: docHref(app.slug, from),
        destination: docHref(app.slug, page.urlPath),
        permanent: true,
      })),
    ),
  );
}

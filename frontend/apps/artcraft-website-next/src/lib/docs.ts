import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE_URL } from "./links";
import { docHref, rawHref } from "../../scripts/docs/core.mjs";
import { DOC_SOURCES, docsCacheDir } from "../../scripts/docs/sources.mjs";
import { loadDocApps, loadGenerated } from "../../scripts/docs/load.mjs";
import { buildNav } from "../../scripts/docs/nav.mjs";
import { renderDoc } from "../../scripts/docs/render.mjs";
import { llmsFull, llmsIndex, rawMarkdown, searchIndex } from "../../scripts/docs/outputs.mjs";

// Docs loaders for /docs. Pages come from each Craft app repo's docs/user/
// folder, fetched into the build cache by scripts/docs/fetch-docs.mjs before
// `next dev` / `next build`. SERVER ONLY, like lib/content.ts: never import
// this from a "use client" component.

export type DocPage = {
  file: string;
  urlPath: string;
  title: string;
  description: string;
  order: number;
  verified: string | null;
  redirectFrom: string[];
  body: string;
};
export type DocApp = {
  slug: string;
  name: string;
  repo: string;
  branch: string;
  path: string;
  sha: string | null;
  fetchedAt: string | null;
  pages: DocPage[];
};
export type NavNode = { title: string; href?: string; children: NavNode[]; order: number };
export type SearchEntry = { app: string; title: string; description: string; headings: string[]; href: string };
export type DocHeading = { depth: number; id: string; text: string };

export { docHref, rawHref };

let apps: DocApp[] | null = null;
let generated: Record<string, string> | null = null;

export function getDocApps(): DocApp[] {
  apps ??= loadDocApps(docsCacheDir(), DOC_SOURCES) as unknown as DocApp[];
  return apps;
}

function getGenerated(): Record<string, string> {
  generated ??= loadGenerated(docsCacheDir()) as Record<string, string>;
  return generated;
}

export function getDocApp(slug: string): DocApp | null {
  return getDocApps().find((app) => app.slug === slug) ?? null;
}

export function findDocPage(app: DocApp, slug: string[] | undefined): DocPage | null {
  const urlPath = (slug ?? []).join("/");
  return app.pages.find((page) => page.urlPath === urlPath) ?? null;
}

export function getDocNav(app: DocApp): NavNode[] {
  return buildNav(app) as unknown as NavNode[];
}

export async function renderDocPage(app: DocApp, page: DocPage): Promise<{ html: string; headings: DocHeading[] }> {
  return renderDoc({
    markdown: page.body,
    generated: getGenerated(),
    slug: app.slug,
    file: page.file,
    repo: app.repo,
    ref: app.sha ?? app.branch,
    path: app.path,
  });
}

export function docEditUrl(app: DocApp, page: DocPage): string {
  return `https://github.com/${app.repo}/edit/${app.branch}/${app.path}/${page.file}`;
}

export function rawDocMarkdown(app: DocApp, page: DocPage): string {
  return rawMarkdown(app, page, getGenerated());
}

export function llmsIndexText(): string {
  return llmsIndex(getDocApps(), SITE_URL);
}

export function llmsFullText(app: DocApp): string {
  return llmsFull(app, getGenerated(), SITE_URL);
}

export function docsSearchIndex(): SearchEntry[] {
  return searchIndex(getDocApps()) as SearchEntry[];
}

export function supportSkillMarkdown(): string {
  return readFileSync(join(process.cwd(), "src", "content", "agents", "support.md"), "utf8");
}

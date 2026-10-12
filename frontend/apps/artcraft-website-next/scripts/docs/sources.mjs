// Craft app repos whose docs/user/ folder is published under /docs/<slug>.
// Adding an app is one entry here. No top-level await: next.config.ts imports
// this module.
import { resolve } from "node:path";

export const DOC_SOURCES = [
  { slug: "artcraft", name: "ArtCraft", repo: "storytold/artcraft", branch: "main", path: "docs/user" },
  { slug: "craft-launcher", name: "Craft Launcher", repo: "storytold/craft-launcher", branch: "main", path: "docs/user" },
];

// Static segments under /docs that an app slug must never shadow.
export const RESERVED_SLUGS = new Set(["agents", "search-index.json"]);

export function docsCacheDir() {
  return resolve(process.cwd(), process.env.DOCS_CACHE_DIR || ".next/cache/craft-docs");
}

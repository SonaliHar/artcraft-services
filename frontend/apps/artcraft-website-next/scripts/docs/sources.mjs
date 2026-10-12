// Craft app repos whose docs/user/ folder is published under /docs/<slug>.
// Adding an app is one entry here. No top-level await: next.config.ts imports
// this module.
import { resolve } from "node:path";

export const DOC_SOURCES = [
  { slug: "artcraft", name: "ArtCraft", repo: "storytold/artcraft", branch: "main", path: "docs/user" },
  { slug: "craft-launcher", name: "ArtCraft Launcher", repo: "storytold/craft-launcher", branch: "main", path: "docs/user" },
  // The Craft apps, in /apps lineup order; names match craftAppName().
  { slug: "photocraft", name: "PhotoCraft", repo: "storytold/photocraft", branch: "main", path: "docs/user" },
  { slug: "vectorcraft", name: "VectorCraft", repo: "storytold/vectorcraft", branch: "main", path: "docs/user" },
  { slug: "filmcraft", name: "FilmCraft", repo: "storytold/filmcraft", branch: "main", path: "docs/user" },
  { slug: "lightcraft", name: "LightCraft", repo: "storytold/lightcraft", branch: "main", path: "docs/user" },
  { slug: "pdfcraft", name: "PdfCraft", repo: "storytold/pdfcraft", branch: "main", path: "docs/user" },
  { slug: "effectcraft", name: "EffectCraft", repo: "storytold/effectcraft", branch: "main", path: "docs/user" },
  { slug: "designcraft", name: "DesignCraft", repo: "storytold/designcraft", branch: "main", path: "docs/user" },
  { slug: "wordcraft", name: "WordCraft", repo: "storytold/wordcraft", branch: "main", path: "docs/user" },
  { slug: "soundcraft", name: "SoundCraft", repo: "storytold/soundcraft", branch: "main", path: "docs/user" },
  { slug: "deckcraft", name: "DeckCraft", repo: "storytold/deckcraft", branch: "main", path: "docs/user" },
  { slug: "cadcraft", name: "CADCraft", repo: "storytold/cadcraft", branch: "main", path: "docs/user" },
  { slug: "gridcraft", name: "GridCraft", repo: "storytold/gridcraft", branch: "main", path: "docs/user" },
];

// Static segments under /docs that an app slug must never shadow.
export const RESERVED_SLUGS = new Set(["agents", "search-index.json"]);

export function docsCacheDir() {
  return resolve(process.cwd(), process.env.DOCS_CACHE_DIR || ".next/cache/craft-docs");
}

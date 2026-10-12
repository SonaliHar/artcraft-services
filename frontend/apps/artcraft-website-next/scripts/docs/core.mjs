// Craft docs checker and shared helpers. ZERO DEPENDENCIES, ONE FILE: the
// Craft app repos download this file in their docs-check workflow and run
// `node core.mjs docs/user`. The website build uses the same rules, so a page
// that passes here renders there. Do not add imports beyond node:*, and do
// not use top-level await (next.config.ts imports this module).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { pathToFileURL } from "node:url";

const SKIP_FILES = new Set(["agents.md", "claude.md", "readme.md"]);
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SCHEME_OR_ROOT = /^(?:[a-z][a-z0-9+.-]*:|#|\/)/i;
export const GENERATED_MARKER = /^<!--\s*generated:([a-z0-9-]+)\s*-->[ \t]*$/gm;

export function parseFrontmatter(raw) {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  if (lines[0] !== "---") {
    return { data: {}, body: text, errors: ["missing frontmatter (--- block at the top)"] };
  }
  const close = lines.indexOf("---", 1);
  if (close === -1) {
    return { data: {}, body: text, errors: ["frontmatter is not closed with ---"] };
  }
  const data = {};
  const errors = [];
  lines.slice(1, close).forEach((line, i) => {
    if (!line.trim() || line.trimStart().startsWith("#")) return;
    const match = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!match) {
      errors.push(`frontmatter line ${i + 2}: expected "key: value" or "key: [a, b]"`);
      return;
    }
    data[match[1]] = parseValue(match[2]);
  });
  return { data, body: lines.slice(close + 1).join("\n"), errors };
}

function unquote(value) {
  const quoted = value.match(/^(["'])(.*)\1$/);
  return quoted ? quoted[2] : value;
}

function parseValue(raw) {
  const value = raw.trim();
  const quoted = value.match(/^(["'])(.*?)\1(?:\s+#.*)?$/);
  if (quoted) return quoted[2];
  const bare = value.replace(/\s+#.*$/, "");
  if (bare.startsWith("[") && bare.endsWith("]")) {
    return bare
      .slice(1, -1)
      .split(",")
      .map((item) => unquote(item.trim()))
      .filter(Boolean);
  }
  return bare;
}

export function pageUrlPath(file) {
  const noExt = file.replace(/\.md$/, "");
  if (noExt === "index") return "";
  return noExt.endsWith("/index") ? noExt.slice(0, -"/index".length) : noExt;
}

export function docHref(slug, urlPath, hash = "") {
  return `/docs/${slug}${urlPath ? `/${urlPath}` : ""}${hash}`;
}

export function rawHref(slug, file) {
  return `/docs/${slug}/${file}`;
}

export function resolveRelative(fromFile, target) {
  const joined = posix.normalize(posix.join(posix.dirname(fromFile), target));
  return joined === ".." || joined.startsWith("../") ? null : joined;
}

export function relativeLinks(body) {
  const prose = body
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, "")
    .replace(/`[^`\n]*`/g, "");
  const out = [];
  for (const match of prose.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
    const href = match[1];
    if (SCHEME_OR_ROOT.test(href)) continue;
    out.push(href.split(/[?#]/)[0]);
  }
  return out;
}

export function collectPages(root) {
  const pages = [];
  const assets = new Set();
  const walk = (rel) => {
    for (const name of readdirSync(join(root, rel)).sort()) {
      if (name.startsWith(".") || name.startsWith("_")) continue;
      const file = rel ? `${rel}/${name}` : name;
      if (statSync(join(root, file)).isDirectory()) {
        walk(file);
      } else if (!name.endsWith(".md")) {
        assets.add(file);
      } else if (!SKIP_FILES.has(name.toLowerCase())) {
        const { data, body, errors } = parseFrontmatter(readFileSync(join(root, file), "utf8"));
        pages.push({ file, urlPath: pageUrlPath(file), data, body, errors });
      }
    }
  };
  walk("");
  return { pages, assets };
}

const isKebabPath = (path) => path.split("/").every((segment) => SEGMENT.test(segment));

export function validatePages({ pages, assets }) {
  const errors = [];
  const warnings = [];
  const files = new Set(pages.map((p) => p.file));
  const urls = new Map();
  if (!files.has("index.md")) {
    errors.push("index.md: missing (the docs folder needs a root index.md)");
  }
  for (const p of pages) {
    const error = (msg) => errors.push(`${p.file}: ${msg}`);
    p.errors.forEach(error);
    if (!isKebabPath(p.file.replace(/\.md$/, ""))) {
      error("file and folder names must be lowercase-kebab (a-z, 0-9, -)");
    }
    for (const key of ["title", "description"]) {
      if (typeof p.data[key] !== "string" || !p.data[key]) error(`frontmatter "${key}" is required`);
    }
    if (p.data.order !== undefined && !/^-?\d+$/.test(String(p.data.order))) {
      error(`"order" must be a whole number`);
    }
    if (p.data.verified !== undefined && !/^\d+\.\d+(?:\.\d+)?$/.test(String(p.data.verified))) {
      warnings.push(`${p.file}: "verified" should look like 1.2.3`);
    }
    if (/^# /m.test(p.body.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, ""))) {
      warnings.push(`${p.file}: start the body at ## (the title comes from frontmatter)`);
    }
    if (urls.has(p.urlPath)) error(`same URL as ${urls.get(p.urlPath)}`);
    else urls.set(p.urlPath, p.file);
    for (const href of relativeLinks(p.body)) {
      const target = resolveRelative(p.file, href);
      if (target === null) error(`link "${href}" points outside the docs folder`);
      else if (target.endsWith(".md") ? !files.has(target) : !assets.has(target)) {
        error(`broken link "${href}"`);
      }
    }
  }
  const claimed = new Map();
  for (const p of pages) {
    for (const raw of [].concat(p.data.redirect_from ?? [])) {
      const path = String(raw).replace(/^\/+|\/+$/g, "");
      if (!path) continue;
      if (!isKebabPath(path)) errors.push(`${p.file}: redirect_from "${raw}" must be a lowercase-kebab path`);
      else if (urls.has(path)) errors.push(`${p.file}: redirect_from "${raw}" is an existing page (${urls.get(path)})`);
      else if (claimed.has(path)) errors.push(`${p.file}: redirect_from "${raw}" is also claimed by ${claimed.get(path)}`);
      else claimed.set(path, p.file);
    }
  }
  return { errors, warnings };
}

export function expandGenerated(markdown, generated) {
  return markdown.replace(
    GENERATED_MARKER,
    (_line, id) => generated[id]?.trim() ?? "_This list is temporarily unavailable._",
  );
}

function main(dir = "docs/user") {
  let result;
  try {
    result = validatePages(collectPages(dir));
  } catch (err) {
    console.error(`docs check: cannot read ${dir}: ${err.message}`);
    process.exit(2);
  }
  for (const warning of result.warnings) console.warn(`warning: ${warning}`);
  for (const error of result.errors) console.error(`error: ${error}`);
  console.log(`docs check: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
  process.exit(result.errors.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv[2]);
}

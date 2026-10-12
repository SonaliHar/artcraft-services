import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectPages,
  docHref,
  expandGenerated,
  GENERATED_IDS,
  pageUrlPath,
  parseFrontmatter,
  rawHref,
  relativeLinks,
  validatePages,
} from "./core.mjs";

const CORE = join(dirname(fileURLToPath(import.meta.url)), "core.mjs");

const page = (title, extra = "", body = "## Hello\n\nBody.") =>
  `---\ntitle: ${title}\ndescription: About ${title}.\n${extra}---\n${body}\n`;

function tree(files) {
  const root = mkdtempSync(join(tmpdir(), "craft-docs-"));
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), content);
  }
  return root;
}
const check = (files) => validatePages(collectPages(tree(files)));

test("parses the frontmatter subset, including CRLF, BOM, quotes and comments", () => {
  const raw =
    '﻿---\r\ntitle: "Fix: app won\'t start" # quoted\r\ndescription: One line # comment\r\n' +
    'order: 10\r\nredirect_from: [old/path, "older"]\r\n---\r\n## Hi\r\n';
  const { data, body, errors } = parseFrontmatter(raw);
  assert.deepEqual(errors, []);
  assert.equal(data.title, "Fix: app won't start");
  assert.equal(data.description, "One line");
  assert.equal(data.order, "10");
  assert.deepEqual(data.redirect_from, ["old/path", "older"]);
  assert.equal(body, "## Hi\n");
});

test("keeps colons in unquoted values", () => {
  assert.equal(parseFrontmatter("---\ntitle: Fix: it\n---\n").data.title, "Fix: it");
});

test("reports unsupported and missing frontmatter", () => {
  assert.match(parseFrontmatter("---\ntags:\n  - a\n---\n").errors[0], /line 3/);
  assert.deepEqual(parseFrontmatter("## no frontmatter").errors, ["missing frontmatter (--- block at the top)"]);
  assert.deepEqual(parseFrontmatter("---\ntitle: x\n").errors, ["frontmatter is not closed with ---"]);
});

test("maps files to URLs", () => {
  assert.equal(pageUrlPath("index.md"), "");
  assert.equal(pageUrlPath("guides/index.md"), "guides");
  assert.equal(pageUrlPath("guides/text-to-image.md"), "guides/text-to-image");
  assert.equal(docHref("artcraft", ""), "/docs/artcraft");
  assert.equal(docHref("artcraft", "guides/a", "#fix"), "/docs/artcraft/guides/a#fix");
  assert.equal(rawHref("artcraft", "guides/a.md"), "/docs/artcraft/guides/a.md");
});

test("finds relative links outside code only", () => {
  const body = [
    "See [a](../a.md#x), [img](./shot.png), [web](https://x.dev), [top](#top), [abs](/download).",
    "`[code](inline.md)`",
    "```md",
    "[fenced](fenced.md)",
    "```",
  ].join("\n");
  assert.deepEqual(relativeLinks(body), ["../a.md", "./shot.png"]);
});

test("a valid tree has no errors", () => {
  const result = check({
    "index.md": page("Home", "", "## Start\n\nRead [the guide](guides/a.md#step) and see ![shot](images/shot.png)."),
    "guides/index.md": page("Guides"),
    "guides/a.md": page("Guide A", "order: 2\nverified: 0.9.4\nredirect_from: [old-a]\n", "## Step\n\nBack [home](../index.md)."),
    "images/shot.png": "png",
    "AGENTS.md": "# not a page",
    "_drafts/wip.md": "not even frontmatter",
  });
  assert.deepEqual(result, { errors: [], warnings: [] });
});

test("skips AGENTS.md, CLAUDE.md, README.md and _/. entries", () => {
  const { pages } = collectPages(tree({
    "index.md": page("Home"),
    "AGENTS.md": "x",
    "CLAUDE.md": "x",
    "guides/README.md": "x",
    ".hidden/a.md": "x",
    "_drafts/a.md": "x",
  }));
  assert.deepEqual(pages.map((p) => p.file), ["index.md"]);
});

test("reports each kind of error", () => {
  const { errors, warnings } = check({
    "index.md": page("Home", "", "## A\n\n[gone](missing.md) [out](../../etc.md) [pic](nope.png)"),
    "Guides/Bad Name.md": page("Bad"),
    "no-desc.md": "---\ntitle: No desc\n---\n## x\n",
    "dup.md": page("Dup"),
    "dup/index.md": page("Dup index"),
    "redir.md": page("Redir", "redirect_from: [dup]\norder: first\nverified: latest\n", "# Title in body\n"),
  });
  const joined = errors.join("\n");
  assert.match(joined, /index\.md: broken link "missing\.md"/);
  assert.match(joined, /index\.md: link "\.\.\/\.\.\/etc\.md" points outside the docs folder/);
  assert.match(joined, /index\.md: broken link "nope\.png"/);
  assert.match(joined, /Guides\/Bad Name\.md: file and folder names must be lowercase-kebab/);
  assert.match(joined, /no-desc\.md: frontmatter "description" is required/);
  assert.match(joined, /dup\.md: same URL as dup\/index\.md/);
  assert.match(joined, /redir\.md: redirect_from "dup" is an existing page \(dup\/index\.md\)/);
  assert.match(joined, /redir\.md: "order" must be a whole number/);
  assert.match(warnings.join("\n"), /redir\.md: "verified" should look like 1\.2\.3/);
  assert.match(warnings.join("\n"), /redir\.md: start the body at ## \(the title comes from frontmatter\)/);
});

test("requires a root index.md", () => {
  assert.match(check({ "a.md": page("A") }).errors.join("\n"), /index\.md: missing/);
});

test("expands generated markers and marks unknown ones", () => {
  const md = "## Models\n\n<!-- generated:artcraft-models -->\n\n<!-- generated:nope -->\n";
  const out = expandGenerated(md, { "artcraft-models": "| A |\n| - |\n| 1 |" });
  assert.match(out, /\| A \|/);
  assert.match(out, /_This list is temporarily unavailable\._/);
});

test("generated markers named like Object.prototype keys do not throw", () => {
  const md = "<!-- generated:constructor -->\n\n<!-- generated:__proto__ -->\n\n<!-- generated:to-string -->\n";
  let out;
  assert.doesNotThrow(() => {
    out = expandGenerated(md, {});
  });
  assert.equal(out.match(/_This list is temporarily unavailable\._/g).length, 2);
  assert.doesNotThrow(() => expandGenerated("<!-- generated:constructor -->\n", { "artcraft-models": "x" }));
});

test("only known generated ids pass the check, markers in code are ignored", () => {
  assert.ok(GENERATED_IDS.has("artcraft-models"));
  const { errors } = check({
    "index.md": page(
      "Home",
      "",
      "## A\n\n<!-- generated:artcraft-models -->\n\n<!-- generated:constructor -->\n\n```md\n<!-- generated:in-a-fence -->\n```\n",
    ),
  });
  const joined = errors.join("\n");
  assert.match(joined, /index\.md: unknown generated id "constructor"/);
  assert.doesNotMatch(joined, /artcraft-models/);
  assert.doesNotMatch(joined, /in-a-fence/);
});

test("CLI exits 1 with readable errors, 0 when clean, 2 when the folder is missing", () => {
  const bad = spawnSync(process.execPath, [CORE, tree({ "index.md": "---\ntitle: x\n---\n" })], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /error: index\.md: frontmatter "description" is required/);
  const good = spawnSync(process.execPath, [CORE, tree({ "index.md": page("Home") })], { encoding: "utf8" });
  assert.equal(good.status, 0);
  assert.match(good.stdout, /0 error\(s\)/);
  const missing = spawnSync(process.execPath, [CORE, join(tmpdir(), "does-not-exist-craft-docs")], { encoding: "utf8" });
  assert.equal(missing.status, 2);
});

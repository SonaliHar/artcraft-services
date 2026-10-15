import { test } from "node:test";
import assert from "node:assert/strict";
import { llmsFull, llmsIndex, rawMarkdown, searchIndex } from "./outputs.mjs";
import { renderDoc } from "./render.mjs";

const app = {
  slug: "artcraft", name: "ArtCraft", repo: "storytold/artcraft", branch: "main", path: "docs/user", sha: null,
  pages: [
    { file: "index.md", urlPath: "", title: "Home", description: "Start here.", body: "## Hi\n" },
    { file: "reference/models.md", urlPath: "reference/models", title: "Models", description: "All models.", body: "## Image and video models\n\n<!-- generated:artcraft-models -->\n" },
  ],
};
const SITE = "https://getartcraft.com";

test("llms.txt lists every page as a Markdown link with its description", () => {
  const text = llmsIndex([app], SITE);
  assert.match(text, /^# Craft docs/);
  assert.match(text, /\[Models\]\(https:\/\/getartcraft\.com\/docs\/artcraft\/reference\/models\.md\): All models\./);
  assert.match(text, /https:\/\/getartcraft\.com\/docs\/artcraft\/llms-full\.txt/);
  assert.match(text, /https:\/\/getartcraft\.com\/docs\/agents\/support\.md/);
});

test("llms.txt escapes square brackets in page titles so the link stays a link", () => {
  const bracketed = {
    ...app,
    pages: [{ file: "faq/beta.md", urlPath: "faq/beta", title: "What does [Beta] mean? [x]", description: "Labels.", body: "## A\n" }],
  };
  const text = llmsIndex([bracketed], SITE);
  assert.match(text, /^- \[What does \\\[Beta\\\] mean\? \\\[x\\\]\]\(https:\/\/getartcraft\.com\/docs\/artcraft\/faq\/beta\.md\): Labels\.$/m);
});

test("llms-full.txt has every page with its URL and generated content", () => {
  const text = llmsFull(app, { "artcraft-models": "| Veo 3 |" }, SITE);
  assert.match(text, /URL: https:\/\/getartcraft\.com\/docs\/artcraft\/reference\/models/);
  assert.match(text, /\| Veo 3 \|/);
  assert.doesNotMatch(text, /generated:artcraft-models/);
});

test("raw markdown starts with title and description", () => {
  assert.equal(rawMarkdown(app, app.pages[0], {}), "# Home\n\n> Start here.\n\n## Hi\n");
});

test("raw markdown and llms-full.txt carry the version each page was checked against", () => {
  const checked = { file: "guides/cull.md", urlPath: "guides/cull", title: "Cull", description: "Pick keepers.", verified: "0.7.1", body: "## Flag photos\n" };
  const withChecked = { ...app, pages: [checked] };
  assert.equal(rawMarkdown(withChecked, checked, {}), "# Cull\n\n> Pick keepers.\n\nChecked against: v0.7.1\n\n## Flag photos\n");
  assert.match(llmsFull(withChecked, {}, SITE), /^> Pick keepers\.\n\nChecked against: v0\.7\.1\n\n## Flag photos$/m);
});

test("search index carries headings and hrefs", () => {
  assert.deepEqual(searchIndex([app])[1], {
    app: "ArtCraft", title: "Models", description: "All models.",
    headings: ["Image and video models"], headingIds: ["image-and-video-models"],
    href: "/docs/artcraft/reference/models",
  });
});

test("search heading ids match the ids the page renders with", async () => {
  const body = [
    "## Run `artcraft --safe` from [the terminal](https://x.dev)",
    "",
    "```bash",
    "## not a heading",
    "```",
    "",
    "#### Deep **bold** note",
    "",
    "### Fix it",
    "",
    "## Fix it ##",
    "",
    "~~~",
    "### also not a heading",
    "~~~",
  ].join("\n");
  const page = { file: "a.md", urlPath: "a", title: "A", description: "", body };
  const [entry] = searchIndex([{ ...app, pages: [page] }]);
  assert.deepEqual(entry.headings, ["Run artcraft --safe from the terminal", "Fix it", "Fix it"]);

  const { headings } = await renderDoc({ markdown: body, generated: {}, slug: "artcraft", file: "a.md", repo: "r/r", ref: "main", path: "docs" });
  assert.deepEqual(entry.headingIds, headings.map((h) => h.id));
  assert.deepEqual(entry.headingIds, ["run-artcraft---safe-from-the-terminal", "fix-it", "fix-it-1"]);
});

const renderIds = async (markdown, generated = {}) =>
  (await renderDoc({ markdown, generated, slug: "artcraft", file: "a.md", repo: "r/r", ref: "main", path: "docs" })).headings;

test("search headings keep literal asterisks and drop _em_ and escapes like the page", async () => {
  const body = [
    "## 5 * 3 * 2 credits",
    "## An _emphasised_ word",
    "## snake\\_case and \\*stars\\*",
    "> ## Quoted heading",
    "- ## Listed heading",
  ].join("\n\n");
  const [entry] = searchIndex([{ ...app, pages: [{ file: "a.md", urlPath: "a", title: "A", description: "", body }] }]);
  assert.deepEqual(entry.headings, ["5 * 3 * 2 credits", "An emphasised word", "snake_case and *stars*", "Quoted heading", "Listed heading"]);
  assert.deepEqual(entry.headingIds, ["5--3--2-credits", "an-emphasised-word", "snake_case-and-stars", "quoted-heading", "listed-heading"]);
  assert.deepEqual(entry.headingIds, (await renderIds(body)).map((h) => h.id));
});

test("search headings count headings in generated content, as the page does", async () => {
  const body = "<!-- generated:faq -->\n\n## Credits";
  const generated = { faq: "## Credits\n\nGenerated." };
  const [entry] = searchIndex([{ ...app, pages: [{ file: "a.md", urlPath: "a", title: "A", description: "", body }] }], generated);
  assert.deepEqual(entry.headingIds, ["credits", "credits-1"]);
  assert.deepEqual(entry.headingIds, (await renderIds(body, generated)).map((h) => h.id));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { renderDoc } from "./render.mjs";

const base = { generated: {}, slug: "artcraft", file: "guides/a.md", repo: "storytold/artcraft", ref: "c".repeat(40), path: "docs/user" };
const render = (markdown, extra = {}) => renderDoc({ ...base, ...extra, markdown });

test("rewrites relative page links and images", async () => {
  const { html } = await render("[fix](../troubleshooting/x.md#fix) [home](../index.md) ![shot](./shot.png) [web](https://x.dev)");
  assert.match(html, /href="\/docs\/artcraft\/troubleshooting\/x#fix"/);
  assert.match(html, /href="\/docs\/artcraft"/);
  assert.match(html, new RegExp(`src="https://raw.githubusercontent.com/storytold/artcraft/${"c".repeat(40)}/docs/user/guides/shot.png"`));
  assert.match(html, /href="https:\/\/x\.dev"/);
});

test("drops raw HTML, event handlers and javascript: links", async () => {
  const { html } = await render('<script>window.x=1</script>\n\n<img src="x" onerror="alert(1)">\n\n[bad](javascript:alert(1))');
  assert.doesNotMatch(html, /<script|onerror|javascript:/i);
});

test("adds heading ids, anchors and a heading list", async () => {
  const { html, headings } = await render("## Step one\n\n### Detail\n\n#### Too deep");
  assert.match(html, /<h2 id="step-one">Step one<a[^>]*href="#step-one"/);
  assert.deepEqual(headings, [
    { depth: 2, id: "step-one", text: "Step one" },
    { depth: 3, id: "detail", text: "Detail" },
  ]);
});

test("renders GFM tables, code and generated content", async () => {
  const { html } = await render("## M\n\n<!-- generated:artcraft-models -->\n\n```bash\necho hi\n```", {
    generated: { "artcraft-models": "| Model |\n| --- |\n| Veo 3 |" },
  });
  assert.match(html, /<table>/);
  assert.match(html, /<td>Veo 3<\/td>/);
  assert.match(html, /<code class="language-bash">echo hi/);
});

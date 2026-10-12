// Markdown → HTML for docs pages. Pages arrive from public PRs in many repos,
// so raw HTML is dropped (remark-rehype default) and the tree is sanitized
// before ids and anchors are added.
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toString } from "hast-util-to-string";
import { docHref, expandGenerated, pageUrlPath, resolveRelative } from "./core.mjs";

const SCHEME_OR_ROOT = /^(?:[a-z][a-z0-9+.-]*:|#|\/)/i;

function rewriteLinks({ slug, file, repo, ref, path }) {
  return (tree) => {
    visit(tree, ["link", "image", "definition"], (node) => {
      if (!node.url || SCHEME_OR_ROOT.test(node.url)) return;
      const hashAt = node.url.indexOf("#");
      const hash = hashAt === -1 ? "" : node.url.slice(hashAt);
      const target = (hashAt === -1 ? node.url : node.url.slice(0, hashAt)).split("?")[0];
      const resolved = resolveRelative(file, target);
      if (resolved === null) return;
      node.url = resolved.endsWith(".md")
        ? docHref(slug, pageUrlPath(resolved), hash)
        : `https://raw.githubusercontent.com/${repo}/${ref}/${path}/${resolved}`;
    });
  };
}

function collectHeadings(headings) {
  return () => (tree) => {
    visit(tree, "element", (node) => {
      if ((node.tagName === "h2" || node.tagName === "h3") && node.properties?.id) {
        headings.push({ depth: Number(node.tagName[1]), id: String(node.properties.id), text: toString(node) });
      }
    });
  };
}

// Tables scroll sideways inside a wrapper instead of turning the table itself
// into a block, which would drop its table semantics for screen readers. The
// wrapper is a focusable, labelled region so keyboard users can scroll it.
function wrapTables() {
  return (tree) => {
    let lastHeading = null;
    visit(tree, "element", (node, index, parent) => {
      if (/^h[1-6]$/.test(node.tagName)) lastHeading = toString(node);
      if (node.tagName !== "table" || !parent || index === undefined) return;
      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: {
          className: ["table-scroll"],
          role: "region",
          tabIndex: 0,
          ariaLabel: lastHeading ? `${lastHeading} (table)` : "Table",
        },
        children: [node],
      };
      return "skip";
    });
  };
}

// Code blocks sit in a positioned frame so the page script can pin a copy
// button to the corner without the button scrolling away with long lines.
// The frame carries the fence language for a small corner label.
function wrapCodeBlocks() {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "pre" || !parent || index === undefined) return;
      const code = node.children.find((child) => child.type === "element" && child.tagName === "code");
      const classes = [code?.properties?.className ?? []].flat().map(String);
      const language = classes.find((name) => name.startsWith("language-"))?.slice("language-".length);
      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { className: ["code-block"], ...(language ? { dataLanguage: language } : {}) },
        children: [node],
      };
      return "skip";
    });
  };
}

// Markdown tree → sanitized HTML tree with heading ids. Shared by the page
// render and the search index, so section ids in search can't drift from
// the ids on the page.
const toSluggedHtml = { plugins: [remarkRehype, rehypeSanitize, rehypeSlug] };

// A page's h2/h3 headings with their rendered ids and text, without
// rendering the page. Generated content is expanded first, as on the page,
// so repeated titles get the same -1, -2 suffixes.
export function pageHeadings(markdown, generated = {}) {
  const headings = [];
  const processor = unified().use(remarkParse).use(remarkGfm).use(toSluggedHtml).use(collectHeadings(headings));
  processor.runSync(processor.parse(expandGenerated(markdown, generated)));
  return headings;
}

export async function renderDoc({ markdown, generated = {}, slug, file, repo, ref, path }) {
  const headings = [];
  const output = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(rewriteLinks, { slug, file, repo, ref, path })
    .use(toSluggedHtml)
    .use(collectHeadings(headings))
    .use(wrapTables)
    .use(wrapCodeBlocks)
    .use(rehypeAutolinkHeadings, {
      behavior: "append",
      properties: { className: ["heading-anchor"], ariaLabel: "Link to this section" },
      content: { type: "text", value: "#" },
    })
    .use(rehypeStringify)
    .process(expandGenerated(markdown, generated));
  return { html: String(output), headings };
}

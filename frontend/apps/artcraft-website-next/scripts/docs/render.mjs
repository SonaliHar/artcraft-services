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

export async function renderDoc({ markdown, generated = {}, slug, file, repo, ref, path }) {
  const headings = [];
  const output = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(rewriteLinks, { slug, file, repo, ref, path })
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeSlug)
    .use(collectHeadings(headings))
    .use(rehypeAutolinkHeadings, {
      behavior: "append",
      properties: { className: ["heading-anchor"], ariaLabel: "Link to this section" },
      content: { type: "text", value: "#" },
    })
    .use(rehypeStringify)
    .process(expandGenerated(markdown, generated));
  return { html: String(output), headings };
}

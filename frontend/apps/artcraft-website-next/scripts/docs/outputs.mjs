// Text outputs for agents and search: /llms.txt, /docs/<app>/llms-full.txt,
// raw .md pages and the JSON search index.
import GithubSlugger from "github-slugger";
import { docHref, expandGenerated, rawHref } from "./core.mjs";

const byFile = (app) => [...app.pages].sort((a, b) => a.file.localeCompare(b.file));

export function llmsIndex(apps, siteUrl) {
  const lines = [
    "# Craft docs",
    "",
    "> Official user documentation for ArtCraft and the Craft apps, built from each app's GitHub repo. Every page below links to its Markdown source.",
    "",
    `Answering a user question as an agent? Follow ${siteUrl}/docs/agents/support.md`,
    "",
  ];
  for (const app of apps) {
    lines.push(`## ${app.name}`, "", `- [All ${app.name} docs in one file](${siteUrl}/docs/${app.slug}/llms-full.txt)`);
    for (const page of byFile(app)) {
      lines.push(`- [${page.title}](${siteUrl}${rawHref(app.slug, page.file)}): ${page.description}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function llmsFull(app, generated, siteUrl) {
  const parts = [`# ${app.name} documentation`, "", `Source: https://github.com/${app.repo}/tree/${app.branch}/${app.path}`, ""];
  for (const page of byFile(app)) {
    parts.push(
      "---", "",
      `# ${page.title}`, "",
      `URL: ${siteUrl}${docHref(app.slug, page.urlPath)}`, "",
      `> ${page.description}`, "",
      expandGenerated(page.body, generated).trim(), "",
    );
  }
  return parts.join("\n");
}

// Relative links stay as written: the raw URL mirrors the file path, so
// "../guides/a.md" resolves to the target's raw URL.
export function rawMarkdown(app, page, generated) {
  return `# ${page.title}\n\n> ${page.description}\n\n${expandGenerated(page.body, generated)}`;
}

export function searchIndex(apps) {
  return apps.flatMap((app) =>
    app.pages.map((page) => {
      const sections = sectionHeadings(page.body);
      return {
        app: app.name,
        title: page.title,
        description: page.description,
        headings: sections.map((h) => h.text),
        headingIds: sections.map((h) => h.id),
        href: docHref(app.slug, page.urlPath),
      };
    }),
  );
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const ATX_HEADING = /^ {0,3}(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;

// The page's h2/h3 headings with the ids rehype-slug gives them. Every
// heading level is slugged in document order, so repeated titles get the
// same -1, -2 suffixes the rendered page has; fenced code is skipped.
function sectionHeadings(body) {
  const slugger = new GithubSlugger();
  const headings = [];
  let fence = null;
  for (const line of body.split("\n")) {
    const fenceMatch = line.match(FENCE);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
      continue;
    }
    if (fenceMatch) {
      fence = fenceMatch[1];
      continue;
    }
    const match = line.match(ATX_HEADING);
    if (!match) continue;
    const text = stripInline(match[2]);
    const id = slugger.slug(text);
    if (match[1].length === 2 || match[1].length === 3) headings.push({ text, id });
  }
  return headings;
}

// Plain text of simple inline Markdown: links and images keep their text,
// code spans keep their content verbatim, `**` / `*` markers and raw HTML
// tags (which the renderer drops) go.
function stripInline(text) {
  return text
    .split(/(`+[^`]*`+)/)
    .map((part, index) =>
      index % 2 === 1
        ? part.replace(/^`+|`+$/g, "")
        : part
            .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
            .replace(/<[^>]+>/g, "")
            .replace(/\*\*(.+?)\*\*/g, "$1")
            .replace(/\*(.+?)\*/g, "$1"),
    )
    .join("")
    .trim();
}

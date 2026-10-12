// Text outputs for agents and search: /llms.txt, /docs/<app>/llms-full.txt,
// raw .md pages and the JSON search index.
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
    app.pages.map((page) => ({
      app: app.name,
      title: page.title,
      description: page.description,
      headings: [...page.body.matchAll(/^#{2,3}\s+(.+?)\s*#*\s*$/gm)].map((m) => m[1]),
      href: docHref(app.slug, page.urlPath),
    })),
  );
}

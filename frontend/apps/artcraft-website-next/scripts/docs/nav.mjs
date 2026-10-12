// Sidebar tree from file paths. A folder's index.md names it and makes it a
// link; folders without one are plain labels.
import { docHref } from "./core.mjs";

const titleFromFolder = (name) => {
  const words = name.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

function sortTree(node) {
  node.children.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  node.children.forEach(sortTree);
}

export function buildNav(app) {
  const root = { title: app.name, children: [], order: 0 };
  const folders = new Map([["", root]]);
  const folderFor = (dir) => {
    const existing = folders.get(dir);
    if (existing) return existing;
    const cut = dir.lastIndexOf("/");
    const node = { title: titleFromFolder(dir.slice(cut + 1)), children: [], order: 100 };
    folderFor(cut === -1 ? "" : dir.slice(0, cut)).children.push(node);
    folders.set(dir, node);
    return node;
  };
  for (const page of app.pages) {
    const cut = page.file.lastIndexOf("/");
    const dir = cut === -1 ? "" : page.file.slice(0, cut);
    const href = docHref(app.slug, page.urlPath);
    if (page.file === "index.md") continue;
    if (page.file.endsWith("/index.md")) {
      Object.assign(folderFor(dir), { title: page.title, order: page.order, href });
      continue;
    }
    folderFor(dir).children.push({ title: page.title, href, children: [], order: page.order });
  }
  sortTree(root);
  return [{ title: "Overview", href: docHref(app.slug, ""), children: [], order: -1 }, ...root.children];
}

export function flattenNav(nodes) {
  return nodes.flatMap((node) => [
    ...(node.href ? [{ title: node.title, href: node.href }] : []),
    ...flattenNav(node.children),
  ]);
}

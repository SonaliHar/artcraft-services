"use client";

import { CopyButton } from "@/components/ui";

// The two things support folks do with a page: paste its link, or paste
// the whole page into a chat or an issue. The Markdown is fetched on click.
export default function DocsPageActions({ url, markdownHref }: { url: string; markdownHref: string }) {
  const loadMarkdown = async () => {
    const res = await fetch(markdownHref);
    if (!res.ok) throw new Error(String(res.status));
    return res.text();
  };
  return (
    <div className="flex flex-wrap gap-2">
      <CopyButton value={url} label="Copy link" copiedLabel="Link copied" variant="action" size="sm" />
      <CopyButton value={loadMarkdown} label="Copy as Markdown" copiedLabel="Markdown copied" variant="action" size="sm" />
    </div>
  );
}

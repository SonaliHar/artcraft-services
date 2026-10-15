"use client";

import { FileTextIcon } from "lucide-react";
import { Button, CopyButton } from "@/components/ui";

// The two things support folks do with a page: paste its link, or paste
// the whole page into a chat or an issue. The Markdown is fetched on click.
// Without JS neither button can copy, so they are hidden and the Markdown
// becomes a plain link instead.
export default function DocsPageActions({ url, markdownHref }: { url: string; markdownHref: string }) {
  const loadMarkdown = async () => {
    const res = await fetch(markdownHref);
    if (!res.ok) throw new Error(String(res.status));
    return res.text();
  };
  return (
    <div className="flex flex-wrap gap-2">
      <noscript>
        <style>{".docs-copy-action{display:none}"}</style>
        <Button href={markdownHref} external variant="action" size="sm">
          <FileTextIcon aria-hidden className="h-3.5 w-3.5" />
          View Markdown
        </Button>
      </noscript>
      {/* `url` is the canonical getartcraft.com address, also on previews. */}
      <CopyButton value={url} label="Copy link" copiedLabel="Link copied" variant="action" size="sm" className="docs-copy-action" />
      <CopyButton
        value={loadMarkdown}
        label="Copy as Markdown"
        copiedLabel="Markdown copied"
        variant="action"
        size="sm"
        className="docs-copy-action"
      />
    </div>
  );
}

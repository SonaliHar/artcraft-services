import Link from "next/link";
import { twMerge } from "tailwind-merge";
import type { NavNode } from "@/lib/docs";
import DocsSearch from "./docs-search";

// The 48px site nav the rail sticks under.
const RAIL = "sticky top-12 z-20 flex max-h-[calc(100dvh-3rem)] flex-col";

// Docs sidebar: a compact search field, then the app's folder tree.
// Top-level entries read as mono section labels (links when the folder has an
// index page); pages sit on a hairline rail, and the current page carries the
// accent marker on that rail.
//
// "rail" is the sticky desktop column: the search stays put while the tree
// scrolls under it, and the search's results float out over the article
// (the scrolling part would clip them). "menu" is the same content inside
// the phone menu.
export default function DocsSidebar({
  nav,
  currentHref,
  variant = "rail",
}: {
  nav: NavNode[];
  currentHref: string;
  variant?: "rail" | "menu";
}) {
  const rail = variant === "rail";
  return (
    <div className={rail ? RAIL : "px-6 pt-1 pb-8"}>
      <DocsSearch variant="compact" className={rail ? "shrink-0 px-6 pt-6 pb-2" : "pb-6"} />
      <nav
        aria-label="Docs"
        className={rail ? "docs-rail min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-4" : undefined}
      >
        <ul className="space-y-5">
          {nav.map((node, index) => (
            <li key={node.href ?? `label-${index}`}>
              <SectionLabel node={node} current={node.href === currentHref} />
              {node.children.length > 0 && <PageList nodes={node.children} currentHref={currentHref} />}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function SectionLabel({ node, current }: { node: NavNode; current: boolean }) {
  if (!node.href) return <span className="hud-label block py-1 text-faint">{node.title}</span>;
  return (
    <Link
      href={node.href}
      aria-current={current ? "page" : undefined}
      className={twMerge(
        "hud-label group/label -mx-1.5 inline-flex py-1",
        current ? "text-ink-strong" : "text-muted hover:text-ink",
      )}
    >
      <span
        className={twMerge(
          "px-1.5 py-0.5 group-hover/label:bg-invert-bg group-hover/label:text-invert-fg",
          current && "bg-invert-bg text-invert-fg",
        )}
      >
        {node.title}
      </span>
    </Link>
  );
}

function PageList({ nodes, currentHref }: { nodes: NavNode[]; currentHref: string }) {
  return (
    <ul className="mt-2 border-l border-line">
      {nodes.map((node, index) => {
        const current = node.href === currentHref;
        return (
          <li key={node.href ?? `label-${index}`}>
            {node.href ? (
              <Link
                href={node.href}
                aria-current={current ? "page" : undefined}
                className={twMerge(
                  "-ml-px block border-l-2 py-1.5 pr-2 pl-4 text-sm leading-snug",
                  current
                    ? "border-accent text-ink-strong"
                    : "border-transparent text-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {node.title}
              </Link>
            ) : (
              <span className="hud-label block py-1.5 pl-4 text-faint">{node.title}</span>
            )}
            {node.children.length > 0 && (
              <div className="pl-4">
                <PageList nodes={node.children} currentHref={currentHref} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

import Link from "next/link";
import { twMerge } from "tailwind-merge";
import type { NavNode } from "@/lib/docs";

// Docs sidebar: the app's folder tree. Folders without an index page are
// plain labels; the current page is marked with aria-current.
export default function DocsSidebar({ nav, currentHref }: { nav: NavNode[]; currentHref: string }) {
  return (
    <nav aria-label="Docs" className="border-b border-line px-6 py-8 md:border-b-0 md:border-r md:px-8 md:py-12">
      <NavList nodes={nav} currentHref={currentHref} />
    </nav>
  );
}

function NavList({ nodes, currentHref, nested = false }: { nodes: NavNode[]; currentHref: string; nested?: boolean }) {
  return (
    <ul className={twMerge("space-y-1", nested && "mt-1 border-l border-line pl-3")}>
      {nodes.map((node) => {
        const current = node.href === currentHref;
        return (
          <li key={node.href ?? node.title}>
            {node.href ? (
              <Link
                href={node.href}
                aria-current={current ? "page" : undefined}
                className={twMerge("block py-1 text-sm text-muted hover:text-ink", current && "font-medium text-ink-strong")}
              >
                {node.title}
              </Link>
            ) : (
              <span className="hud-label block pb-1 pt-3 text-muted">{node.title}</span>
            )}
            {node.children.length > 0 && <NavList nodes={node.children} currentHref={currentHref} nested />}
          </li>
        );
      })}
    </ul>
  );
}

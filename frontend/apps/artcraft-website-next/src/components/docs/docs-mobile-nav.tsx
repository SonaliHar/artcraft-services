import type { ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";
import type { DocHeading, NavNode } from "@/lib/docs";
import DocsSidebar from "./docs-sidebar";

// Small-screen stand-ins for the side rails, built on <details> so they open
// without JS. "Menu" replaces the sidebar below 768px; "On this page"
// replaces the table of contents below 1280px.
export function DocsMenuDisclosure({
  nav,
  currentHref,
  section,
  className,
}: {
  nav: NavNode[];
  currentHref: string;
  section: string;
  className?: string;
}) {
  return (
    // Keyed by page so a client-side navigation lands with the menu closed.
    <Disclosure
      key={currentHref}
      className={className}
      summary={
        <>
          <span className="text-ink">Menu</span>
          <span aria-hidden className="text-faint">·</span>
          <span className="truncate text-muted">{section}</span>
        </>
      }
    >
      <DocsSidebar nav={nav} currentHref={currentHref} className="px-6 pt-2 pb-8" />
    </Disclosure>
  );
}

export function DocsTocDisclosure({ headings, className }: { headings: DocHeading[]; className?: string }) {
  if (headings.length === 0) return null;
  return (
    <Disclosure className={className} summary={<span className="text-ink">On this page</span>}>
      <nav aria-label="On this page" className="px-6 pt-1 pb-6 md:px-10">
        <ul className="border-l border-line">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={twMerge(
                  "-ml-px block border-l-2 border-transparent py-1.5 pr-2 text-sm leading-snug text-muted hover:border-line-strong hover:text-ink",
                  heading.depth === 3 ? "pl-7" : "pl-4",
                )}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </Disclosure>
  );
}

function Disclosure({ summary, children, className }: { summary: ReactNode; children: ReactNode; className?: string }) {
  return (
    <details className={twMerge("group border-b border-line", className)}>
      <summary className="hud-label flex cursor-pointer list-none items-center gap-2 px-6 py-3.5 select-none hover:bg-bg-sunken focus-visible:-outline-offset-2 md:px-10 [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDownIcon
          aria-hidden
          className="ml-auto h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      {children}
    </details>
  );
}

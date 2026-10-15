import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { DocLink } from "@/lib/docs";

// Previous / next pages in sidebar order: two cells split by a hairline, the
// same gap-px grid the rest of the site uses for card rows.
export default function DocsPager({ prev, next }: { prev: DocLink | null; next: DocLink | null }) {
  if (!prev && !next) return null;
  return (
    <nav aria-label="Previous and next pages" className="grid gap-px border-t border-line bg-line sm:grid-cols-2">
      {prev ? <PagerCell link={prev} direction="prev" /> : <div aria-hidden className="hidden bg-bg sm:block" />}
      {next ? <PagerCell link={next} direction="next" /> : <div aria-hidden className="hidden bg-bg sm:block" />}
    </nav>
  );
}

function PagerCell({ link, direction }: { link: DocLink; direction: "prev" | "next" }) {
  const isNext = direction === "next";
  const Icon = isNext ? ChevronRightIcon : ChevronLeftIcon;
  return (
    <Link
      href={link.href}
      rel={isNext ? "next" : "prev"}
      className={`group/pager flex flex-col gap-2 bg-bg px-6 py-6 hover:bg-bg-sunken focus-visible:-outline-offset-2 md:px-10 md:py-8 ${isNext ? "items-end text-right sm:col-start-2" : "items-start"}`}
    >
      <span className="hud-label inline-flex items-center gap-1.5 text-faint group-hover/pager:text-muted">
        {!isNext && <Icon aria-hidden className="h-3.5 w-3.5" />}
        {isNext ? "Next" : "Previous"}
        {isNext && <Icon aria-hidden className="h-3.5 w-3.5" />}
      </span>
      <span className="font-display text-lg leading-tight tracking-[-0.02em] text-ink-strong group-hover/pager:text-(--app-ink,var(--accent-ink)) md:text-xl">
        {link.title}
      </span>
    </Link>
  );
}

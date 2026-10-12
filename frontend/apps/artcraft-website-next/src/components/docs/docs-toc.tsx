"use client";

import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import type { DocHeading } from "@/lib/docs";

// Reading line, as a fraction of the viewport from the top: a heading counts
// as reached once its top passes this line.
const READING_LINE = 0.3;

// "On this page" rail for wide screens. The list is server-rendered complete;
// the script only moves the aria-current marker, which changes colour and
// never size, so nothing shifts when it loads. Positions come from
// IntersectionObserver alone (no scroll listeners).
export default function DocsToc({ headings, className }: { headings: DocHeading[]; className?: string }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const targets = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => el !== null);
    const end = document.getElementById("docs-article-end");
    if (targets.length === 0) return;

    let atEnd = false;
    // Re-reads every heading's position whenever an observer reports a
    // change, so a long jump (Home, a link, the back button) that skips a
    // heading past the line without it ever intersecting still lands right.
    const update = () => {
      if (atEnd && window.scrollY > 0) return setActive(targets[targets.length - 1].id);
      const line = window.innerHeight * READING_LINE;
      let current: string | null = null;
      for (const el of targets) if (el.getBoundingClientRect().top <= line) current = el.id;
      setActive(current);
    };

    // One observer fires as headings cross the reading line, one as they
    // enter or leave the viewport at all.
    const lineObserver = new IntersectionObserver(update, {
      rootMargin: `0px 0px -${Math.round((1 - READING_LINE) * 100)}% 0px`,
    });
    const viewObserver = new IntersectionObserver(update);
    targets.forEach((el) => {
      lineObserver.observe(el);
      viewObserver.observe(el);
    });

    const endObserver = new IntersectionObserver((entries) => {
      atEnd = entries.some((entry) => entry.isIntersecting);
      update();
    });
    if (end) endObserver.observe(end);

    return () => {
      lineObserver.disconnect();
      viewObserver.disconnect();
      endObserver.disconnect();
    };
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="On this page" className={className}>
      <p className="hud-label text-faint">On this page</p>
      <ul className="mt-4 border-l border-line">
        {headings.map((heading) => {
          const current = heading.id === active;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                aria-current={current ? "location" : undefined}
                className={twMerge(
                  "-ml-px block border-l-2 py-1.5 pr-2 text-[0.8125rem] leading-snug transition-colors duration-150",
                  heading.depth === 3 ? "pl-7" : "pl-4",
                  current
                    ? "border-accent text-ink-strong"
                    : "border-transparent text-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

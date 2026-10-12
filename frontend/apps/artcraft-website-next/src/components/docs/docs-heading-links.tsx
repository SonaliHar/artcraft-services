"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "lucide-react";
import { siteUrl } from "@/lib/links";

const SHOW_MS = 1800;
const COPIED = "Link copied";
// Rough width of the confirmation, to keep it inside the column near the
// right edge.
const BUBBLE_WIDTH = 128;

type Bubble = { text: string; left: number; top: number; above: boolean };

// Section anchors (the "#" after each h2/h3) copy the canonical section URL
// on click. The click is not cancelled, so the browser still scrolls to the
// section and puts the hash in the address bar; without JS the anchor is an
// ordinary link. A small status next to the anchor confirms the copy.
export default function DocsHeadingLinks() {
  const ref = useRef<HTMLSpanElement>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const frame = ref.current?.parentElement;
    const article = frame?.querySelector("article");
    if (!frame || !article) return;

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a.heading-anchor");
      const hash = anchor?.getAttribute("href");
      if (!anchor || !hash?.startsWith("#")) return;

      const url = siteUrl(window.location.pathname) + hash;
      const box = anchor.getBoundingClientRect();
      const bounds = frame.getBoundingClientRect();
      const right = box.right - bounds.left + 10;
      const above = right + BUBBLE_WIDTH > bounds.width - 16;
      const place = (text: string) => {
        setBubble({
          text,
          above,
          left: above ? Math.max(0, box.right - bounds.left - BUBBLE_WIDTH) : right,
          top: above ? box.top - bounds.top - 6 : box.top - bounds.top + box.height / 2,
        });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setBubble((current) => current && { ...current, text: "" }), SHOW_MS);
      };
      navigator.clipboard.writeText(url).then(
        () => place(COPIED),
        () => place("Copy blocked, use the address bar"),
      );
    };

    article.addEventListener("click", onClick);
    return () => {
      article.removeEventListener("click", onClick);
      clearTimeout(timer.current);
    };
  }, []);

  const showing = Boolean(bubble?.text);
  return (
    <span
      ref={ref}
      role="status"
      aria-live="polite"
      data-show={showing || undefined}
      data-above={bubble?.above || undefined}
      className="docs-copied hud-label"
      style={bubble ? { left: bubble.left, top: bubble.top } : undefined}
    >
      {showing && (
        <>
          {bubble?.text === COPIED && <CheckIcon aria-hidden className="h-3 w-3" />}
          {bubble?.text}
        </>
      )}
    </span>
  );
}

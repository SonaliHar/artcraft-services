"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "lucide-react";
import { siteUrl } from "@/lib/links";

const SHOW_MS = 1800;
const COPIED = "Link copied";
const BLOCKED = "Copy blocked, use the address bar";

type Bubble = { text: string; left: number; top: number; above: boolean };

// Width of the confirmation chip for a message: padding and icon plus the
// HUD label's mono advance (0.6875rem glyphs + 0.15em tracking ≈ 8.3px).
const bubbleWidth = (text: string) => 36 + text.length * 8.3;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

async function copyText(text: string) {
  if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
  await navigator.clipboard.writeText(text);
}

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

      // Always the canonical getartcraft.com URL, also on dev and previews:
      // these links get pasted into Discord for users.
      const url = siteUrl(window.location.pathname) + hash;
      const box = anchor.getBoundingClientRect();
      const bounds = frame.getBoundingClientRect();
      const place = (text: string) => {
        const width = bubbleWidth(text);
        const right = box.right - bounds.left + 10;
        const above = right + width > bounds.width - 16;
        setBubble({
          text,
          above,
          left: above ? clamp(box.right - bounds.left - width, 0, bounds.width - width) : right,
          top: above ? box.top - bounds.top - 6 : box.top - bounds.top + box.height / 2,
        });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setBubble((current) => current && { ...current, text: "" }), SHOW_MS);
      };
      // No clipboard API at all on insecure origins; the address bar still
      // has the link.
      copyText(url).then(
        () => place(COPIED),
        () => place(BLOCKED),
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

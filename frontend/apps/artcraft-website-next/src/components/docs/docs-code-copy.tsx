"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CopyButton } from "@/components/ui";

type Slot = { element: HTMLElement; code: string };

// Puts a copy button in the corner of every code block in the article. The
// blocks are server-rendered HTML (wrapped in .code-block at render time),
// so each button goes into a slot element this component owns and removes.
export default function DocsCodeCopy() {
  const ref = useRef<HTMLSpanElement>(null);
  const [slots, setSlots] = useState<Slot[]>([]);

  useEffect(() => {
    const article = ref.current?.parentElement?.querySelector("article");
    if (!article) return;
    const created = [...article.querySelectorAll<HTMLElement>(".code-block")].map((block) => {
      const element = document.createElement("span");
      element.className = "code-copy";
      block.append(element);
      block.dataset.copy = "";
      return { element, code: block.querySelector("pre")?.textContent ?? "" };
    });
    setSlots(created);
    return () => created.forEach((slot) => slot.element.remove());
  }, []);

  return (
    <span ref={ref} hidden>
      {slots.map((slot, index) =>
        createPortal(
          <CopyButton
            value={slot.code}
            label="Copy"
            aria-label="Copy code"
            variant="action"
            size="sm"
            className="px-2.5 py-1 text-[0.625rem]"
          />,
          slot.element,
          String(index),
        ),
      )}
    </span>
  );
}

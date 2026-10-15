"use client";

import { useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button, type ButtonProps } from "./button";

const FEEDBACK_MS = 1500;

// "blocked": the browser refused the clipboard. "failed": the text to copy
// could not be loaded.
type CopyState = "idle" | "copied" | "blocked" | "failed";

export interface CopyButtonProps
  extends Omit<ButtonProps, "onClick" | "href" | "children" | "value"> {
  /** Text to copy, or a function that loads it when the button is clicked. */
  value: string | (() => Promise<string>);
  label?: string;
  copiedLabel?: string;
}

class LoadError extends Error {}

// Loaded text goes in as a pending ClipboardItem where supported, so Safari
// still treats the write as part of the click; elsewhere it is written once
// it arrives.
async function writeClipboard(value: CopyButtonProps["value"]) {
  const clipboard = navigator.clipboard;
  if (!clipboard) throw new Error("Clipboard unavailable");
  if (typeof value === "string") return clipboard.writeText(value);
  let loadFailed = false;
  const text = value().catch((error) => {
    loadFailed = true;
    throw error;
  });
  try {
    if (typeof ClipboardItem !== "undefined" && clipboard.write) {
      const blob = text.then((t) => new Blob([t], { type: "text/plain" }));
      // If the write fails first (say, permission denied), nothing awaits
      // `text` any more; mark it handled so a later load failure is not an
      // unhandled rejection. The write still sees it through `blob`.
      text.catch(() => {});
      return await clipboard.write([new ClipboardItem({ "text/plain": blob })]);
    }
    return await clipboard.writeText(await text);
  } catch (error) {
    throw loadFailed ? new LoadError() : error;
  }
}

// Button that writes `value` to the clipboard and confirms inline. The
// label snaps back after a beat; repeat clicks restart the timer.
export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  ...rest
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function copy() {
    let next: CopyState = "copied";
    try {
      await writeClipboard(value);
    } catch (error) {
      next = error instanceof LoadError ? "failed" : "blocked";
    }
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), FEEDBACK_MS);
  }

  const Icon = state === "copied" ? CheckIcon : CopyIcon;
  const text =
    state === "copied"
      ? copiedLabel
      : state === "blocked"
        ? "Copy blocked"
        : state === "failed"
          ? "Copy failed"
          : label;

  return (
    <Button onClick={copy} {...rest}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      <span aria-live="polite">{text}</span>
    </Button>
  );
}

export default CopyButton;

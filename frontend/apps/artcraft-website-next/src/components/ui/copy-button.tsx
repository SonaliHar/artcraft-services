"use client";

import { useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button, type ButtonProps } from "./button";

const FEEDBACK_MS = 1500;

type CopyState = "idle" | "copied" | "failed";

export interface CopyButtonProps
  extends Omit<ButtonProps, "onClick" | "href" | "children" | "value"> {
  /** Text to copy, or a function that loads it when the button is clicked. */
  value: string | (() => Promise<string>);
  label?: string;
  copiedLabel?: string;
}

// Loaded text goes in as a pending ClipboardItem where supported, so Safari
// still treats the write as part of the click; elsewhere it is written once
// it arrives.
async function writeClipboard(value: CopyButtonProps["value"]) {
  if (typeof value === "string") return navigator.clipboard.writeText(value);
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
    const blob = value().then((text) => new Blob([text], { type: "text/plain" }));
    return navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
  }
  return navigator.clipboard.writeText(await value());
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
    } catch {
      next = "failed";
    }
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), FEEDBACK_MS);
  }

  const Icon = state === "copied" ? CheckIcon : CopyIcon;
  const text =
    state === "copied" ? copiedLabel : state === "failed" ? "Copy blocked" : label;

  return (
    <Button onClick={copy} {...rest}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      <span aria-live="polite">{text}</span>
    </Button>
  );
}

export default CopyButton;

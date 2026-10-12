"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CornerDownLeftIcon, HashIcon, SearchIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { queryWords, rankEntries } from "../../../scripts/docs/rank.mjs";
import type { SearchEntry } from "@/lib/docs";

const MAX_RESULTS = 8;
const INDEX_URL = "/docs/search-index.json";

type Hit = { entry: SearchEntry; anchor: string | null };
type IndexState = "idle" | "loading" | "ready" | "failed";

// One fetch of the index shared by every search field on the page. A failed
// fetch is forgotten, so the next focus or "Try again" asks again.
let indexRequest: Promise<SearchEntry[]> | null = null;
function loadIndex(): Promise<SearchEntry[]> {
  indexRequest ??= fetch(INDEX_URL)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
    .catch((error) => {
      indexRequest = null;
      throw error;
    });
  return indexRequest;
}

// Docs search over /docs/search-index.json, loaded on first focus. "hero" is
// the large field on /docs; "compact" sits at the top of the sidebar and the
// mobile menu. Results are a listbox driven from the field (combobox
// pattern): ↑/↓ move, Enter opens, Esc clears. `/` or Ctrl/⌘+K focuses the
// field that is visible right now.
export default function DocsSearch({ variant = "hero", className }: { variant?: "hero" | "compact"; className?: string }) {
  const router = useRouter();
  const id = useId();
  const inputId = `${id}-input`;
  const listId = `${id}-results`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [indexState, setIndexState] = useState<IndexState>("idle");

  const load = () => {
    if (entries || indexState === "loading") return;
    setIndexState("loading");
    loadIndex()
      .then((data) => {
        setEntries(data);
        setIndexState("ready");
      })
      .catch(() => setIndexState("failed"));
  };

  const words = useMemo(() => queryWords(query), [query]);
  const results = useMemo(
    () => (rankEntries(entries ?? [], query) as Hit[]).slice(0, MAX_RESULTS),
    [entries, query],
  );
  const open = focused && words.length > 0;
  const activeHit = active >= 0 ? results[active] : undefined;

  useShortcut(inputRef);

  const hrefOf = (hit: Hit) => hit.entry.href + (hit.anchor ? `#${hit.anchor}` : "");

  const finish = () => {
    setQuery("");
    setActive(-1);
    inputRef.current?.blur();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (results.length === 0) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      // Cycles through the results and back to the field itself (-1).
      setActive((current) => {
        const next = current + step;
        if (next >= results.length) return -1;
        if (next < -1) return results.length - 1;
        return next;
      });
    } else if (event.key === "Enter") {
      const hit = activeHit ?? results[0];
      if (!hit) return;
      event.preventDefault();
      router.push(hrefOf(hit));
      finish();
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish();
    }
  };

  const status =
    !open ? ""
    : indexState === "failed" ? "Search couldn't load."
    : !entries ? "Loading search…"
    : results.length === 0 ? "No pages match."
    : `${results.length} ${results.length === 1 ? "result" : "results"}`;

  const hero = variant === "hero";

  return (
    <div className={twMerge("relative", className)}>
      {hero ? (
        <label htmlFor={inputId} className="hud-label text-muted">Search the docs</label>
      ) : (
        <label htmlFor={inputId} className="sr-only">Search the docs</label>
      )}
      <div className={twMerge("group/field relative", hero && "mt-2")}>
        <SearchIcon
          aria-hidden
          className={twMerge(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-faint",
            hero ? "left-4 h-4 w-4" : "left-3 h-3.5 w-3.5",
          )}
        />
        <input
          ref={inputRef}
          id={inputId}
          data-docs-search=""
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeHit ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          value={query}
          onFocus={() => {
            setFocused(true);
            load();
          }}
          // Start loading the index as the pointer heads for the field.
          onPointerEnter={load}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
          placeholder={hero ? "e.g. linux crash or credits" : "Search docs"}
          className={twMerge(
            "peer w-full border border-line-strong bg-bg-raised text-ink placeholder:text-faint hover:border-ink focus:border-ink focus-visible:outline-offset-0 [&::-webkit-search-cancel-button]:hidden",
            hero ? "h-13 py-3 pr-14 pl-11 text-base" : "h-9 py-2 pr-10 pl-8.5 text-sm",
            open && "border-ink",
          )}
        />
        <kbd
          aria-hidden
          className={twMerge(
            "pointer-events-none absolute top-1/2 flex h-5 min-w-5 -translate-y-1/2 items-center justify-center border border-line bg-bg px-1 font-mono text-[0.6875rem] leading-none text-muted peer-focus:hidden peer-[:not(:placeholder-shown)]:hidden pointer-coarse:hidden",
            hero ? "right-4" : "right-2.5",
          )}
        >
          /
        </kbd>

      {/* Always mounted so screen readers hear the count and errors change. */}
      <p role="status" aria-live="polite" className="sr-only">{status}</p>

      {/* Results hang off the field itself, edge to edge with it. */}

      <div
        hidden={!open}
        className={twMerge(
          "absolute top-full left-0 z-40 border border-t-0 border-ink bg-bg-raised shadow-[0_28px_56px_-28px_rgba(0,0,0,0.45)]",
          hero ? "right-0" : "w-full md:w-[min(30rem,calc(100vw-3rem))]",
        )}
      >
        <div aria-hidden className="hud-label flex items-center justify-between gap-4 border-b border-line px-4 py-2 text-faint">
          <span>{entries && results.length === 0 ? "0 results" : status}</span>
          <span className="hidden items-center gap-3 pointer-fine:flex">
            <span><Key>↑</Key><Key>↓</Key> Move</span>
            <span><Key>↵</Key> Open</span>
            <span><Key>Esc</Key> Close</span>
          </span>
        </div>

        {indexState === "failed" && (
          <div className="flex items-center justify-between gap-4 px-4 py-4 text-sm text-muted">
            <span>Check your connection, then try again.</span>
            <button
              type="button"
              // Keep focus in the field so the list stays open.
              onMouseDown={(event) => event.preventDefault()}
              onClick={load}
              className="hud-label shrink-0 border border-line-strong px-2.5 py-1.5 text-ink hover:bg-invert-bg hover:text-invert-fg"
            >
              Try again
            </button>
          </div>
        )}
        {entries && results.length === 0 && (
          <p className="px-4 py-4 text-sm text-muted">
            Nothing matches <span className="text-ink-strong">“{query.trim()}”</span>. Try fewer or shorter words.
          </p>
        )}

        <ul id={listId} role="listbox" aria-label="Search results" className="max-h-[min(28rem,60dvh)] overflow-y-auto overscroll-contain">
          {results.map((hit, index) => {
            const selected = index === active;
            const headingIndex = hit.anchor ? hit.entry.headingIds.indexOf(hit.anchor) : -1;
            const heading = headingIndex >= 0 ? hit.entry.headings[headingIndex] : null;
            return (
              <li
                key={hrefOf(hit)}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                className="border-b border-line last:border-b-0"
              >
                <Link
                  href={hrefOf(hit)}
                  tabIndex={-1}
                  // Mouse down would blur the field and close the list
                  // before the click lands.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => setActive(index)}
                  onClick={finish}
                  className={twMerge(
                    "group/hit relative block border-l-2 py-3 pr-4 pl-3.5",
                    selected ? "border-accent bg-bg-sunken" : "border-transparent",
                  )}
                >
                  {/* Same order as the "Common fixes" cards: app, then page. */}
                  <span className="hud-label block text-faint">{hit.entry.app}</span>
                  <span className="mt-1 block pr-6 font-medium leading-snug text-ink-strong">
                    <Highlight text={hit.entry.title} words={words} />
                  </span>
                  {hit.entry.description && (
                    <span className="mt-1 line-clamp-2 block text-[0.8125rem] leading-relaxed text-muted">
                      <Highlight text={hit.entry.description} words={words} />
                    </span>
                  )}
                  {heading && (
                    <span className="mt-2 flex items-center gap-1.5 font-mono text-xs text-ink">
                      <HashIcon aria-hidden className="h-3 w-3 shrink-0 text-accent-ink" />
                      <span className="min-w-0 truncate">
                        <Highlight text={heading} words={words} />
                      </span>
                    </span>
                  )}
                  <CornerDownLeftIcon
                    aria-hidden
                    className={twMerge("absolute top-3 right-4 h-3.5 w-3.5 text-accent-ink", selected ? "hidden pointer-fine:block" : "hidden")}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      </div>

      <noscript>
        <p className="mt-2 text-sm text-muted">
          Search needs JavaScript. Browse the sections{hero ? " below" : ""}, or open the{" "}
          <a href="/llms.txt" className="text-accent-ink underline underline-offset-2">full page list</a>.
        </p>
      </noscript>
    </div>
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="mr-1 inline-flex h-4 min-w-4 items-center justify-center border border-line px-1 font-mono text-[0.625rem] leading-none tracking-normal text-muted">
      {children}
    </kbd>
  );
}

// Wraps every occurrence of a query word in <mark>.
function Highlight({ text, words }: { text: string; words: string[] }) {
  if (words.length === 0) return text;
  const escaped = [...words].sort((a, b) => b.length - a.length).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "gi"));
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="docs-mark">{part}</mark>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

// `/` and Ctrl/⌘+K focus the search field that is on screen. Every field
// listens; only the one the page would pick acts. On phones the field lives
// in the closed menu, which is opened first.
function useShortcut(inputRef: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const slash = event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey;
      const commandK = event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey) && !event.altKey;
      if (!slash && !commandK) return;
      if (commandK && inputRef.current && event.target === inputRef.current) {
        event.preventDefault();
        inputRef.current.select();
        return;
      }
      if (isTyping(event.target)) return;
      const target = pickField();
      if (!target || target !== inputRef.current) return;
      event.preventDefault();
      const menu = target.closest("details");
      if (menu && !menu.open) menu.open = true;
      target.focus();
      target.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inputRef]);
}

function pickField(): HTMLInputElement | null {
  const fields = [...document.querySelectorAll<HTMLInputElement>("input[data-docs-search]")];
  const visible = fields.find((field) => field.getClientRects().length > 0);
  if (visible) return visible;
  // A field in a closed menu that is itself on screen.
  return fields.find((field) => {
    const menu = field.closest("details");
    return menu !== null && !menu.open && menu.getClientRects().length > 0;
  }) ?? null;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

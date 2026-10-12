"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { rankEntries } from "../../../scripts/docs/rank.mjs";
import type { SearchEntry } from "@/lib/docs";

// Docs search over /docs/search-index.json, loaded on first focus.
export default function DocsSearch() {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    if (entries || failed) return;
    fetch("/docs/search-index.json")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: SearchEntry[]) => setEntries(data))
      .catch(() => setFailed(true));
  };

  const results = useMemo(
    () => (rankEntries(entries ?? [], query) as SearchEntry[]).slice(0, 8),
    [entries, query],
  );

  return (
    <div>
      <label htmlFor="docs-search" className="hud-label text-muted">Search the docs</label>
      <div className="relative mt-2">
        <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          id="docs-search"
          type="search"
          value={query}
          onFocus={load}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. linux crash or credits"
          className="h-13 w-full border border-line-strong bg-bg-raised py-3 pr-4 pl-11 text-base text-ink placeholder:text-faint hover:border-ink focus:border-ink focus-visible:outline-offset-0"
        />
      </div>
      {failed && <p className="mt-3 text-sm text-muted">Search is unavailable right now.</p>}
      {query.trim() && entries && (
        <ul className="divide-y divide-line border border-t-0 border-line-strong bg-bg-raised" aria-label="Search results">
          {results.length === 0 && <li className="px-4 py-3 text-sm text-muted">No matches.</li>}
          {results.map((entry) => (
            <li key={entry.href}>
              <Link href={entry.href} className="block px-4 py-3 hover:bg-bg-sunken focus-visible:-outline-offset-2">
                <span className="font-medium text-ink-strong">{entry.title}</span>
                <span className="hud-label ml-2 text-faint">{entry.app}</span>
                <p className="mt-1 text-sm text-muted">{entry.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

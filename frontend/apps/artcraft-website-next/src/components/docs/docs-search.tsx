"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
    <div className="mx-auto max-w-3xl">
      <label htmlFor="docs-search" className="hud-label text-muted">Search the docs</label>
      <input
        id="docs-search"
        type="search"
        value={query}
        onFocus={load}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="e.g. linux crash, credits, image to video"
        className="mt-2 w-full border border-line bg-bg-sunken px-4 py-3 text-ink outline-none focus:border-line-strong"
      />
      {failed && <p className="mt-3 text-sm text-muted">Search is unavailable right now.</p>}
      {query.trim() && entries && (
        <ul className="mt-3 divide-y divide-line border border-line" aria-label="Search results">
          {results.length === 0 && <li className="px-4 py-3 text-sm text-muted">No matches.</li>}
          {results.map((entry) => (
            <li key={entry.href}>
              <Link href={entry.href} className="block px-4 py-3 hover:bg-bg-sunken">
                <span className="text-ink-strong">{entry.title}</span>
                <span className="hud-label ml-2 text-muted">{entry.app}</span>
                <p className="mt-1 text-sm text-muted">{entry.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

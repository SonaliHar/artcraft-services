// Client-side docs search ranking. No imports: this ships to the browser.
// Returns { entry, anchor }: anchor is the id of the heading holding the most
// query words (the first such heading on ties), or null when none holds any.
export function rankEntries(entries, query) {
  const words = queryWords(query);
  if (!words.length) return [];
  const scored = [];
  for (const entry of entries) {
    const title = entry.title.toLowerCase();
    const headings = entry.headings.map((h) => h.toLowerCase());
    const rest = [entry.description, ...headings, entry.app].join(" ").toLowerCase();
    let score = 0;
    for (const word of words) {
      if (title.includes(word)) score += 3;
      else if (rest.includes(word)) score += 1;
      else { score = -1; break; }
    }
    if (score > 0) scored.push({ entry, score, anchor: bestAnchor(entry, headings, words) });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .map(({ entry, anchor }) => ({ entry, anchor }));
}

// Lowercased, de-duplicated words of a query, in order.
export function queryWords(query) {
  return [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))];
}

function bestAnchor(entry, headings, words) {
  let best = null;
  let bestCount = 0;
  headings.forEach((heading, index) => {
    const count = words.filter((word) => heading.includes(word)).length;
    if (count > bestCount) {
      bestCount = count;
      best = entry.headingIds?.[index] ?? null;
    }
  });
  return best;
}

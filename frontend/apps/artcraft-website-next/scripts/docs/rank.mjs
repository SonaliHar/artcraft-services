// Client-side docs search ranking. No imports: this ships to the browser.
export function rankEntries(entries, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored = [];
  for (const entry of entries) {
    const title = entry.title.toLowerCase();
    const rest = [entry.description, ...entry.headings, entry.app].join(" ").toLowerCase();
    let score = 0;
    for (const word of words) {
      if (title.includes(word)) score += 3;
      else if (rest.includes(word)) score += 1;
      else { score = -1; break; }
    }
    if (score > 0) scored.push({ entry, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .map((s) => s.entry);
}

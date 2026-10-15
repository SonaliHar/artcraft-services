// "Common fixes" on /docs: a few specific symptoms per app, not the generic
// "how to ask for help" pages every app's troubleshooting folder ends with.

// Matched on the title and on the file name, so a page renamed on either side
// still counts: "Report a problem" lives in get-help.md, send-a-bug-report.md,
// file-a-bug.md and bug-reports.md across the apps.
const GENERIC_TITLE = /^(report a problem|get help|send a bug report|file a bug|bug reports?)\b/i;
const GENERIC_FILE = /^(get-help|report-a-problem|send-a-bug-report|file-a-bug|bug-reports?)(-|\.md$)/;

export function isGenericHelpPage(page) {
  const name = page.file.split("/").pop();
  return GENERIC_TITLE.test(page.title.trim()) || GENERIC_FILE.test(name);
}

// Pages under troubleshooting/ (not the folder's index, not help pages), in
// sidebar order, at most `limit`.
export function pickCommonFixes(pages, limit = 3) {
  return pages
    .filter((page) => page.file.startsWith("troubleshooting/") && !page.file.endsWith("index.md"))
    .filter((page) => !isGenericHelpPage(page))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    .slice(0, limit);
}

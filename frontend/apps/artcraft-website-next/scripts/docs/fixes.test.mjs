import { test } from "node:test";
import assert from "node:assert/strict";
import { isGenericHelpPage, pickCommonFixes } from "./fixes.mjs";

const page = (file, title, order = 0) => ({ file, title, order });

test("help and bug-report pages are generic, by title or by file name", () => {
  for (const p of [
    page("troubleshooting/get-help.md", "Get help with a problem"),
    page("troubleshooting/get-help-and-find-the-log.md", "Get help and find the log file"),
    page("troubleshooting/send-a-bug-report.md", "Report a problem"),
    page("troubleshooting/x.md", "Send a bug report"),
    page("troubleshooting/x.md", "File a bug"),
    page("troubleshooting/bug-reports.md", "Something else"),
    page("troubleshooting/file-a-bug.md", "Something else"),
    page("troubleshooting/report-a-problem.md", "Something else"),
  ]) {
    assert.ok(isGenericHelpPage(p), `${p.file} / ${p.title}`);
  }
  for (const p of [
    page("troubleshooting/launcher-does-not-open.md", "The launcher does not open"),
    page("troubleshooting/no-printers-listed.md", "No printers are listed in the Print dialog"),
    page("troubleshooting/typing-fails-after-install.md", "Typing does nothing after the installer"),
    page("troubleshooting/help-menu-empty.md", "The Help menu is empty"),
  ]) {
    assert.ok(!isGenericHelpPage(p), `${p.file} / ${p.title}`);
  }
});

test("common fixes: only troubleshooting pages, no index, no help pages, in order, capped", () => {
  const pages = [
    page("troubleshooting/index.md", "Troubleshooting", 30),
    page("troubleshooting/get-help.md", "Get help with a problem", 5),
    page("troubleshooting/b.md", "B", 20),
    page("troubleshooting/a.md", "A", 10),
    page("troubleshooting/d.md", "D", 40),
    page("troubleshooting/c.md", "C", 30),
    page("guides/first.md", "First guide", 1),
  ];
  assert.deepEqual(pickCommonFixes(pages).map((p) => p.title), ["A", "B", "C"]);
  assert.deepEqual(pickCommonFixes(pages, 2).map((p) => p.title), ["A", "B"]);
  assert.deepEqual(pickCommonFixes([page("troubleshooting/get-help.md", "Get help", 1)]), []);
});

test("ties in order fall back to the title", () => {
  const pages = [page("troubleshooting/z.md", "Zebra", 10), page("troubleshooting/y.md", "Apple", 10)];
  assert.deepEqual(pickCommonFixes(pages).map((p) => p.title), ["Apple", "Zebra"]);
});

---
name: craft-docs-support
description: Answer a user's question about ArtCraft or a Craft app from the official docs at getartcraft.com/docs, with a link. If the docs do not cover it, work out the answer from the app's repo, open a PR that adds the page, and still answer. Use when a Discord mod or a user asks how a Craft app works or how to fix a problem with it.
---

# Answering Craft app questions from the docs

You are helping a Discord mod (or a user) answer a question about ArtCraft or another Craft app.
The official docs are at https://getartcraft.com/docs. They are written in each app's GitHub repo
under `docs/user/`, so a gap in the docs is fixed with a PR to that repo.

## 1. Look it up

1. Fetch https://getartcraft.com/llms.txt and pick the app the question is about. If it is unclear,
   ask the mod which app, or answer for the most likely one and say so.
2. Fetch that app's `llms-full.txt` (linked in llms.txt) and look for the answer.

## 2. If the docs answer it

- Reply in at most ~1500 characters, plain words, ready to paste into Discord.
- Link the exact page, and the section when there is one: `https://getartcraft.com/docs/<app>/<page>#<heading-id>`.
  To get the section link, copy it from the `#` next to the heading (it gives the full URL), or
  slug the heading the way GitHub does.
- If the page's "Checked against" version (in the page footer, or `verified:` in its `.md`) is
  older than the latest release (`gh release view -R storytold/<repo> --json tagName`), check the
  claim against the code first. If the docs are wrong, answer correctly and fix the page (step 3).

## 3. If the docs do not answer it

1. Check that nobody is already writing it:
   `gh pr list -R storytold/<repo> --search "docs(support) in:title" --state open`.
   If a matching PR exists, answer from it and link the PR.
2. Work out the answer from the source: `gh repo clone storytold/<repo> -- --depth 1`, then read the
   code, `gh issue list -R storytold/<repo> --search "<words>"` and recent releases.
   Do not guess. Every claim needs a source you opened.
3. Write the page in `docs/user/` following that repo's `docs/user/AGENTS.md`
   (frontmatter, one question per page, lead with the answer).
4. Run the checker:
   `curl -fsSL https://raw.githubusercontent.com/storytold/artcraft-services/main/frontend/apps/artcraft-website-next/scripts/docs/core.mjs -o /tmp/docs-core.mjs && node /tmp/docs-core.mjs docs/user`
5. Open a PR from your fork titled `docs(support): <page title>`. In the body, quote the question
   without any Discord names or IDs, and list the sources you used.
6. Reply with the answer and: `Docs page coming: https://getartcraft.com/docs/<app>/<path> (PR #<n>)`.
   The URL is the file path without `docs/user/` and `.md`.

## 4. If it is a bug, not a docs gap

Say it looks like a bug. Search open issues; link one if it exists, otherwise open one with steps
to reproduce (no Discord names). Give a workaround if you found one, and add a troubleshooting
page if the workaround is worth keeping.

## 5. If you are not sure

Say so plainly. Do not guess. Suggest asking in the ArtCraft Discord or opening an issue.

## Rules

- No Discord usernames, IDs or private details in PRs, issues or docs.
- Never say something works unless a doc, the code or a release says so.
- Keep replies short and friendly; no marketing language.

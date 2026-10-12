# Docs pipeline: maintainer notes

## How docs flow

App repo (`docs/user/**`) -> `fetch-docs.mjs` downloads it at build time -> cache
(`DOCS_CACHE_DIR`) -> `load.mjs` / `render.mjs` -> pages under `/docs`, raw `.md`,
`/llms.txt` and per-app `llms-full.txt`.

Needs Node 22.12 or newer (`engines` in `package.json`). `npm run dev` and
`npm run build` run the fetch first through their `predev` / `prebuild` scripts, so
there is no separate step.

## Preview local docs

```bash
DOCS_LOCAL_SOURCES=artcraft=../path/to/artcraft/docs/user \
DOCS_CACHE_DIR=.next/cache/craft-docs-preview npm run dev
```

Use the separate preview cache folder. A local preview is unreviewed work in
progress, and in the default cache it would become the "last good" copy that a later
build falls back to when GitHub is unreachable.

## Add an app

Add one entry to `sources.mjs`. The app repo copies `docs-check.yml` and
`docs-publish.yml` from storytold/artcraft.

## Environment variables

| Variable             | Purpose                                                                       |
|----------------------|-------------------------------------------------------------------------------|
| `DOCS_CACHE_DIR`     | Where fetched docs are cached (default `.next/cache/craft-docs`)              |
| `DOCS_FIXTURE_DIR`   | Read docs from a local fixture tree instead of downloading (tests)            |
| `DOCS_SKIP_FETCH`    | Set to `1` to skip the download and use the cache as it is (other values: no) |
| `GITHUB_TOKEN`       | Read-only public-repo token; recommended for production builds (see below)    |
| `DOCS_LOCAL_SOURCES` | `app=path` pairs, comma separated, to preview local docs                      |

Every request has a 15 second timeout. A source that times out, fails or doesn't
validate keeps its last good copy, or is left out if it has none, so the build never
fails on one app.

## Rebuild hook

Create one Netlify build hook. Store the same URL as the `DOCS_BUILD_HOOK` secret in
artcraft-services and in each app repo. The nightly workflow
(`.github/workflows/docs-nightly.yml` at the repo root) also calls it once a day and
skips quietly when the secret is missing.

Set a `GITHUB_TOKEN` Netlify environment variable (a read-only public-repo token);
it is recommended for production. Each build makes 2 GitHub API calls per source,
28 for the 14 sources, and unauthenticated calls are limited to 60 an hour per IP,
shared across Netlify's builders. A rate-limited fetch logs
`x-ratelimit-remaining` and "rate limited — set GITHUB_TOKEN".

## Tests

```bash
npm run test:docs       # unit tests for scripts/docs
npm run test:docs:e2e   # Playwright against the fixtures in tests/fixtures/docs
```

The Playwright config uses Google Chrome by default. Without Chrome installed, run
with `PLAYWRIGHT_CHANNEL=chromium` to use Playwright's bundled Chromium.

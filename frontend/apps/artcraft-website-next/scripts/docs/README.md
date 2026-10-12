# Docs pipeline: maintainer notes

## How docs flow

App repo (`docs/user/**`) -> `fetch-docs.mjs` downloads it at build time -> cache
(`DOCS_CACHE_DIR`) -> `load.mjs` / `render.mjs` -> pages under `/docs`, raw `.md`,
`/llms.txt` and per-app `llms-full.txt`.

## Preview local docs

```bash
DOCS_LOCAL_SOURCES=artcraft=../path/to/artcraft/docs/user npm run dev
```

## Add an app

Add one entry to `sources.mjs`. The app repo copies `docs-check.yml` and
`docs-publish.yml` from storytold/artcraft.

## Environment variables

| Variable             | Purpose                                                              |
|----------------------|----------------------------------------------------------------------|
| `DOCS_CACHE_DIR`     | Where fetched docs are cached                                        |
| `DOCS_FIXTURE_DIR`   | Read docs from a local fixture tree instead of downloading (tests)   |
| `DOCS_SKIP_FETCH`    | Skip the download and use whatever is already cached                 |
| `GITHUB_TOKEN`       | Optional read-only token for public repos; avoids API rate limits    |
| `DOCS_LOCAL_SOURCES` | `app=path` pairs, comma separated, to preview local docs             |

## Rebuild hook

Create one Netlify build hook. Store the same URL as the `DOCS_BUILD_HOOK` secret in
artcraft-services and in each app repo. The nightly workflow
(`.github/workflows/docs-nightly.yml` at the repo root) also calls it once a day and
skips quietly when the secret is missing.

Optionally set a `GITHUB_TOKEN` Netlify environment variable (a read-only public-repo
token). Netlify builders share IPs, so unauthenticated GitHub API calls can hit the
rate limit.

## Tests

```bash
npm run test:docs       # unit tests for scripts/docs
npm run test:docs:e2e   # Playwright against the fixtures in tests/fixtures/docs
```

The Playwright config uses Google Chrome by default. Without Chrome installed, run
with `PLAYWRIGHT_CHANNEL=chromium` to use Playwright's bundled Chromium.

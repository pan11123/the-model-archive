# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

The Model Archive (`the-model-archive`, 模型档案馆) — a bilingual (zh / en) static site cataloguing LLM releases from major AI vendors. Built with Astro 6, deployed to GitHub Pages under base path `/the-model-archive`. Requires Node ≥ 22.12.

## Commands

```bash
npm run dev          # dev server at http://localhost:4321/the-model-archive/
npm run build        # static output → dist/
npm run preview      # preview built dist/

npm test             # vitest run (unit tests in tests/unit/)
npm run test:watch   # vitest watch
npm run test:e2e     # builds, then runs Playwright (tests/e2e/) against `npm run preview`
```

Run a single test:

```bash
npx vitest run tests/unit/period.test.ts
npx playwright test tests/e2e/smoke.spec.ts
```

The path alias `@` resolves to `src/` and is configured in `astro.config.mjs`, `vitest.config.ts`, and `tsconfig.json` (via `astro/tsconfigs/strict`) — keep all three in sync if it changes.

## Architecture

### Data flow (build time)

1. `src/data/vendors.yaml` and `src/data/releases.yaml` are the only sources of truth.
2. `src/lib/loadData.ts#loadAll()` reads them, parses through Zod schemas (`src/lib/schemas.ts`), then runs `crossValidate` (`src/lib/crossValidate.ts`) which enforces:
   - every release's `vendor` matches an existing `vendors.yaml#id`
   - no duplicate `(vendor, model, date)` triples
   - no release dated more than 90 days in the future
   A validation failure throws and breaks the build — this is intentional; CI relies on it.
3. `src/pages/index.astro` calls `loadAll()`, parses URL search params via `parseFilters()`, builds the date×vendor matrix via `buildMatrix()`, and renders SSG output. There is exactly one page.

### Filtering — dual implementation, must stay in sync

Filtering logic exists in two places because the page is fully static but supports interactive filters without page reloads:

- **Server (build time):** `src/lib/period.ts`, `src/lib/url.ts`, `src/lib/matrix.ts` — used by `index.astro` to render the initial state matching `?vendors=…&period=…&lang=…`.
- **Client (runtime):** `src/scripts/filters.client.ts` — duplicates `dateMatchesPeriod` and uses `parseFilters` / `serializeFilters` (imported from `@/lib/url`) to toggle DOM visibility and update the URL via `history.replaceState`. No reload, no re-render.

When changing filter semantics (period definitions, vendor handling, URL param shape), update **both** sides. Unit tests in `tests/unit/period.test.ts` and `tests/unit/url.test.ts` cover the server side; Playwright `tests/e2e/filter.spec.ts` covers the client behavior.

### i18n

Dictionaries live in `src/i18n/zh.ts` and `src/i18n/en.ts`; `getDict(lang)` selects between them. Language comes from the `lang` URL param (default `en`). Bilingual fields in YAML data (`name.zh/en`, `description.zh/en`) are required by the Zod schemas.

### Adding a release

Edit `src/data/releases.yaml`. Required fields: `date` (YYYY-MM-DD), `vendor` (must match a `vendors.yaml#id`), `model`, `description.zh`, `description.en`, `link` (https URL). `crossValidate` will reject orphan vendor refs, duplicates, and far-future dates at build time.

### Deploy

`.github/workflows/deploy.yml` runs `npm ci`, `npm test`, `npm run build` on every push and PR to `main`. On push to `main` it deploys `dist/` to GitHub Pages. The `base: '/the-model-archive'` and `site: 'https://pan11123.github.io'` in `astro.config.mjs` must stay aligned with the Pages target — internal links should use the base, e.g. `/the-model-archive/favicon.svg`.

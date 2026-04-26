# Split releases.yaml by vendor — design

Date: 2026-04-26
Status: approved

## Motivation

`src/data/releases.yaml` is currently a flat list of all releases across vendors. Goals of this change:

- **Readability** — one vendor per file, easier to skim and review.
- **File size** — keep individual files small as the archive grows.
- **Merge friendliness** — concurrent collection on different vendors should not touch the same file.
- **Collaboration** — multiple people or agents can own different vendor files without coordination.

Non-goals:

- Changing the rendered output, URL params, or any user-visible behavior.
- Changing the `Release` shape exposed to downstream code (`loadAll()` returns the same array).

## Layout

```
src/data/
  vendors.yaml              # unchanged — vendor registry
  releases/                 # new
    openai.yaml             # migrated from releases.yaml
    anthropic.yaml          # migrated from releases.yaml
    google.yaml             # migrated from releases.yaml
    xai.yaml                # []
    deepseek.yaml           # []
    alibaba.yaml            # []
    zhipu.yaml              # []
    moonshot.yaml           # []
    minimax.yaml            # []
    bytedance.yaml          # []
```

The old `src/data/releases.yaml` is deleted.

### Invariants

1. **Filename = vendor id.** A file `releases/<id>.yaml` only contains entries whose `vendor` field equals `<id>`. Mismatches fail the build.
2. **Directory mirrors vendors.yaml.** The set of `*.yaml` filenames under `releases/` (basename minus extension) must equal exactly the set of `id` values in `vendors.yaml`. Adding a vendor without creating its file (or vice versa) fails the build.
3. **Per-file order is ascending by date.** New entries are appended to the end of the file. (Render order is unaffected — `matrix.ts` re-sorts at render time.)
4. **Empty file = empty array.** A file containing nothing, or `[]`, is valid and contributes zero entries.

## Schema

`src/lib/schemas.ts` is unchanged. `releaseSchema` still requires the `vendor` field. Each entry stays self-describing; the filename check is an additional layer, not a replacement.

## Loader

`loadReleases()` in `src/lib/loadData.ts` is rewritten to:

1. Read all `*.yaml` files under `src/data/releases/` (sorted by filename for deterministic output).
2. For each file:
   - Compute `fileVendorId = basename(file, '.yaml')`.
   - Parse with `yaml.load(content) ?? []` (treat empty file as empty array).
   - Validate with `releasesFileSchema`.
   - For each parsed entry, assert `entry.vendor === fileVendorId`. On mismatch, throw with a message naming the file and the offending entry (e.g. `releases/openai.yaml entry "GPT-5" has vendor="anthropic", expected "openai"`).
3. Concatenate all entries and return `Release[]`.

`loadVendors()` and `loadAll()` keep their current signatures. Downstream code (`src/pages/index.astro`, etc.) requires no changes.

## Cross-validation

`src/lib/crossValidate.ts` keeps its existing rules (vendor-id existence, `(vendor, model, date)` dedupe, future-date cap) and gains one new rule:

- The set of release filenames under `releases/` must equal the set of vendor ids. Symmetric-difference both ways throws with a clear message listing the unexpected and missing names.

This rule lives in `crossValidate` because it is a cross-data-source consistency check, in the same spirit as the existing vendor-id check. It runs after `loadReleases()` and `loadVendors()` have parsed their inputs.

## Migration

Steps:

1. Add a one-shot `scripts/migrate-releases.mjs` that reads the current `releases.yaml`, groups entries by `vendor`, sorts each group by `date` ascending, and writes `src/data/releases/<vendor>.yaml` for each. For the seven vendors with no current releases, write `[]`.
2. Run the script.
3. Run `npm test && npm run build`. Fix any issues.
4. `git rm src/data/releases.yaml`. Delete `scripts/migrate-releases.mjs` (one-shot, not kept).
5. Update `loadData.ts` and `crossValidate.ts` per sections above.
6. Update tests (see below).
7. Update docs and links (see below).

## Tests

Unit tests under `tests/unit/`:

- **Extend `crossValidate.test.ts`**:
  - Files-vs-vendors mismatch (extra file) → throws.
  - Files-vs-vendors mismatch (missing file) → throws.
  - Matched sets → does not throw.
- **New `loadReleases.test.ts`** (or extend an existing loader test) covering:
  - File whose entry has `vendor !== filename` → throws with a message naming the file.
  - Empty file → treated as empty array, no throw.
  - File with `[]` → treated as empty array, no throw.
  - Multi-file load returns the concatenation of all entries with the correct count.

Existing `period`, `url`, `matrix`, `stats`, `lang`, `slug` tests are unaffected — they do not read real data files.

E2E tests are unaffected — they exercise built output, which depends only on `loadAll()`'s observable behavior.

## Doc and link updates

- **`README.md`** — change "Edit `src/data/releases.yaml`" to "Edit `src/data/releases/<vendor>.yaml`" and note the filename-equals-vendor rule plus ascending-date convention.
- **`CLAUDE.md`** — update the Data flow section and the "Adding a release" section to describe the new layout, the filename-vendor invariant, and the ascending-date convention. Keep the "build fails on validation errors" wording.
- **`src/components/Footer.astro`** — the Data link currently points to `${REPO}/blob/main/src/data/releases.yaml`. Repoint to `${REPO}/tree/main/src/data/releases` so it lands on the directory listing.

## Rollback

A single `git revert` of the merge commit restores the old single-file layout. There is no schema change and no runtime data format change, so no data fix-up is needed on rollback.

## Out of scope

- Splitting individual vendor files further (e.g. by year). Premature for current volumes.
- Generating a derived combined `releases.yaml` for external consumers. Not requested; can be added later if needed.
- Tooling to auto-create a vendor file when a new vendor is added to `vendors.yaml`. The build-fail message is sufficient guidance.

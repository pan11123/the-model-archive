# Split releases.yaml by vendor — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `src/data/releases.yaml` into one file per vendor under `src/data/releases/<vendor-id>.yaml`, with the build enforcing that each filename matches the entries' `vendor` field and that the set of files mirrors `vendors.yaml`.

**Architecture:** New loader helper reads every `*.yaml` under `src/data/releases/`, treats empty file or `[]` as empty list, and asserts each entry's `vendor` equals the filename. `crossValidate` gains an optional 3rd argument `releaseFileIds` and asserts that set equals the set of vendor ids. `loadReleases()` becomes a thin wrapper that calls the new helper. `loadAll()` passes the discovered file ids into `crossValidate`. `Release` schema and the `loadAll()` return shape are unchanged.

**Tech Stack:** TypeScript, Astro 6, Zod, js-yaml, Vitest.

Spec: `docs/superpowers/specs/2026-04-26-split-releases-by-vendor-design.md`.

---

## File map

- Modify `src/lib/loadData.ts` — add `loadReleasesFromDir`, rewrite `loadReleases`, update `loadAll`
- Modify `src/lib/crossValidate.ts` — accept optional `releaseFileIds`, add files↔vendors set rule
- Modify `tests/unit/crossValidate.test.ts` — add cases for the new rule
- Create `tests/unit/loadReleasesFromDir.test.ts` + fixtures under `tests/fixtures/release-dirs/`
- Create `scripts/migrate-releases.mjs` (one-shot, deleted in Task 4)
- Create `src/data/releases/<vendor-id>.yaml` × 10 (3 with data, 7 with `[]`)
- Delete `src/data/releases.yaml`
- Modify `src/components/Footer.astro:19` — repoint Data link to the directory tree
- Modify `README.md:7-13` — describe new layout
- Modify `CLAUDE.md:34, 55-57` — Data flow + Adding a release sections

---

## Task 1: Add `loadReleasesFromDir` helper (TDD)

**Files:**
- Modify: `src/lib/loadData.ts`
- Create: `tests/unit/loadReleasesFromDir.test.ts`
- Create: `tests/fixtures/release-dirs/happy/openai.yaml`
- Create: `tests/fixtures/release-dirs/happy/anthropic.yaml`
- Create: `tests/fixtures/release-dirs/empty-string/openai.yaml`
- Create: `tests/fixtures/release-dirs/empty-array/openai.yaml`
- Create: `tests/fixtures/release-dirs/mismatch/openai.yaml`

- [ ] **Step 1: Create happy-path fixture files**

`tests/fixtures/release-dirs/happy/openai.yaml`:

```yaml
- date: 2024-05-13
  vendor: openai
  model: GPT-4o
  description:
    zh: 全模态。
    en: Omnimodal.
  link: https://openai.com/index/hello-gpt-4o/
```

`tests/fixtures/release-dirs/happy/anthropic.yaml`:

```yaml
- date: 2024-06-20
  vendor: anthropic
  model: Claude 3.5 Sonnet
  description:
    zh: 更强更快。
    en: Smarter, faster.
  link: https://www.anthropic.com/news/claude-3-5-sonnet
- date: 2024-03-04
  vendor: anthropic
  model: Claude 3
  description:
    zh: 三件套。
    en: Family of three.
  link: https://www.anthropic.com/news/claude-3-family
```

- [ ] **Step 2: Create empty-file fixtures**

`tests/fixtures/release-dirs/empty-string/openai.yaml` — write the file with **zero bytes** (no newline, no content). On Windows: `printf '' > tests/fixtures/release-dirs/empty-string/openai.yaml` via the bash tool.

`tests/fixtures/release-dirs/empty-array/openai.yaml`:

```yaml
[]
```

- [ ] **Step 3: Create mismatch fixture**

`tests/fixtures/release-dirs/mismatch/openai.yaml`:

```yaml
- date: 2024-05-13
  vendor: anthropic
  model: Wrong File
  description:
    zh: 错放。
    en: Wrong file.
  link: https://example.com/x
```

- [ ] **Step 4: Write the failing happy-path test**

Create `tests/unit/loadReleasesFromDir.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadReleasesFromDir } from '@/lib/loadData';

const FIXTURES = path.resolve(__dirname, '../fixtures/release-dirs');

describe('loadReleasesFromDir', () => {
  it('concatenates entries from all files and returns sorted file ids', () => {
    const { releases, fileIds } = loadReleasesFromDir(path.join(FIXTURES, 'happy'));
    expect(fileIds).toEqual(['anthropic', 'openai']);
    expect(releases).toHaveLength(3);
    expect(releases.map((r) => r.model).sort()).toEqual(
      ['Claude 3', 'Claude 3.5 Sonnet', 'GPT-4o'],
    );
  });
});
```

- [ ] **Step 5: Run the test and confirm it fails**

Run: `npx vitest run tests/unit/loadReleasesFromDir.test.ts`
Expected: FAIL — `loadReleasesFromDir` is not exported from `@/lib/loadData`.

- [ ] **Step 6: Implement minimal `loadReleasesFromDir`**

Edit `src/lib/loadData.ts`. Add at the bottom (keep existing exports):

```ts
export function loadReleasesFromDir(dir: string): { releases: Release[]; fileIds: string[] } {
  const entries = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .sort();
  const fileIds: string[] = [];
  const releases: Release[] = [];
  for (const file of entries) {
    const id = file.slice(0, -'.yaml'.length);
    fileIds.push(id);
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    const parsed = releasesFileSchema.parse(yaml.load(raw) ?? []);
    for (const entry of parsed) {
      if (entry.vendor !== id) {
        throw new Error(
          `releases/${file} entry "${entry.model}" has vendor="${entry.vendor}", expected "${id}"`,
        );
      }
      releases.push(entry);
    }
  }
  return { releases, fileIds };
}
```

- [ ] **Step 7: Run the test and confirm it passes**

Run: `npx vitest run tests/unit/loadReleasesFromDir.test.ts`
Expected: PASS (1 test).

- [ ] **Step 8: Add empty-file and empty-array tests**

Append to `tests/unit/loadReleasesFromDir.test.ts`:

```ts
  it('treats a zero-byte file as an empty list', () => {
    const { releases, fileIds } = loadReleasesFromDir(path.join(FIXTURES, 'empty-string'));
    expect(fileIds).toEqual(['openai']);
    expect(releases).toEqual([]);
  });

  it('treats `[]` as an empty list', () => {
    const { releases, fileIds } = loadReleasesFromDir(path.join(FIXTURES, 'empty-array'));
    expect(fileIds).toEqual(['openai']);
    expect(releases).toEqual([]);
  });
```

- [ ] **Step 9: Run the tests and confirm all three pass**

Run: `npx vitest run tests/unit/loadReleasesFromDir.test.ts`
Expected: PASS (3 tests). The `?? []` in the implementation already handles both cases.

- [ ] **Step 10: Add filename-mismatch test**

Append to `tests/unit/loadReleasesFromDir.test.ts`:

```ts
  it('throws when an entry vendor disagrees with the filename', () => {
    expect(() => loadReleasesFromDir(path.join(FIXTURES, 'mismatch'))).toThrow(
      /openai\.yaml.*vendor="anthropic".*expected "openai"/,
    );
  });
```

- [ ] **Step 11: Run the tests and confirm all four pass**

Run: `npx vitest run tests/unit/loadReleasesFromDir.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 12: Run the full unit suite to confirm no regressions**

Run: `npm test`
Expected: PASS, including all existing suites.

- [ ] **Step 13: Commit**

```bash
git add src/lib/loadData.ts tests/unit/loadReleasesFromDir.test.ts tests/fixtures/release-dirs
git commit -m "feat(loader): add loadReleasesFromDir with filename-vendor invariant"
```

---

## Task 2: Extend `crossValidate` with files↔vendors set rule (TDD)

**Files:**
- Modify: `src/lib/crossValidate.ts`
- Modify: `tests/unit/crossValidate.test.ts`

- [ ] **Step 1: Write the failing extra-file test**

Append to `tests/unit/crossValidate.test.ts` inside the existing `describe('crossValidate', ...)` block:

```ts
  it('rejects a release file whose name is not a known vendor', () => {
    expect(() => crossValidate(vendors, [], ['openai', 'mystery'])).toThrow(
      /releases\/mystery\.yaml.*not in vendors\.yaml/i,
    );
  });

  it('rejects a vendor that has no release file', () => {
    const twoVendors: Vendor[] = [
      ...vendors,
      { id: 'anthropic', name: { zh: 'A', en: 'A' }, color: '#cc785c', website: 'https://anthropic.com' },
    ];
    expect(() => crossValidate(twoVendors, [], ['openai'])).toThrow(
      /vendor "anthropic".*has no release file/i,
    );
  });

  it('passes when file ids equal vendor ids', () => {
    expect(() => crossValidate(vendors, [], ['openai'])).not.toThrow();
  });
```

- [ ] **Step 2: Run the new tests and confirm they fail**

Run: `npx vitest run tests/unit/crossValidate.test.ts`
Expected: the three new tests fail (the existing four still pass). The first two fail because the 3rd arg is currently ignored; the third passes by accident — that's fine as long as the first two are clearly red.

- [ ] **Step 3: Extend `crossValidate` to accept `releaseFileIds`**

Replace the body of `src/lib/crossValidate.ts`:

```ts
import type { Vendor, Release } from '@/lib/schemas';

export function crossValidate(
  vendors: Vendor[],
  releases: Release[],
  releaseFileIds?: string[],
): void {
  const vendorIds = new Set(vendors.map((v) => v.id));

  if (releaseFileIds !== undefined) {
    const fileIdSet = new Set(releaseFileIds);
    for (const id of fileIdSet) {
      if (!vendorIds.has(id)) {
        throw new Error(`releases/${id}.yaml is not in vendors.yaml`);
      }
    }
    for (const id of vendorIds) {
      if (!fileIdSet.has(id)) {
        throw new Error(`vendor "${id}" has no release file at releases/${id}.yaml`);
      }
    }
  }

  const seen = new Set<string>();
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 90);

  for (const r of releases) {
    if (!vendorIds.has(r.vendor)) {
      throw new Error(`unknown vendor "${r.vendor}" in release ${r.date} ${r.model}`);
    }
    const key = `${r.vendor}|${r.model}|${r.date}`;
    if (seen.has(key)) {
      throw new Error(`duplicate release: ${key}`);
    }
    seen.add(key);
    if (new Date(r.date) > cutoff) {
      throw new Error(`release date ${r.date} is more than 90 days in the future`);
    }
  }
}
```

- [ ] **Step 4: Run the suite and confirm all crossValidate tests pass**

Run: `npx vitest run tests/unit/crossValidate.test.ts`
Expected: PASS (7 tests — original 4 still pass because `releaseFileIds` is optional).

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/crossValidate.ts tests/unit/crossValidate.test.ts
git commit -m "feat(crossValidate): assert release files mirror vendors set"
```

---

## Task 3: Migrate data into per-vendor files

This task only produces the new files. It does not yet wire the loader to read them, so the build still uses the old `releases.yaml` and stays green.

**Files:**
- Create: `scripts/migrate-releases.mjs`
- Create: `src/data/releases/openai.yaml`
- Create: `src/data/releases/anthropic.yaml`
- Create: `src/data/releases/google.yaml`
- Create: `src/data/releases/xai.yaml`
- Create: `src/data/releases/deepseek.yaml`
- Create: `src/data/releases/alibaba.yaml`
- Create: `src/data/releases/zhipu.yaml`
- Create: `src/data/releases/moonshot.yaml`
- Create: `src/data/releases/minimax.yaml`
- Create: `src/data/releases/bytedance.yaml`

- [ ] **Step 1: Write the migration script**

Create `scripts/migrate-releases.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const root = process.cwd();
const DATA = path.join(root, 'src/data');
const vendors = yaml.load(fs.readFileSync(path.join(DATA, 'vendors.yaml'), 'utf-8'));
const releases = yaml.load(fs.readFileSync(path.join(DATA, 'releases.yaml'), 'utf-8'));

const OUT = path.join(DATA, 'releases');
fs.mkdirSync(OUT, { recursive: true });

const groups = new Map();
for (const v of vendors) groups.set(v.id, []);
for (const r of releases) {
  if (!groups.has(r.vendor)) {
    throw new Error(`releases.yaml references unknown vendor "${r.vendor}"`);
  }
  groups.get(r.vendor).push(r);
}

for (const [id, list] of groups) {
  list.sort((a, b) => a.date.localeCompare(b.date));
  const body = list.length === 0 ? '[]\n' : yaml.dump(list, { lineWidth: -1, noRefs: true });
  fs.writeFileSync(path.join(OUT, `${id}.yaml`), body);
  console.log(`${id}.yaml: ${list.length} entries`);
}
```

- [ ] **Step 2: Run the script**

Run: `node scripts/migrate-releases.mjs`
Expected output (counts may shift if data has changed since this plan was written):

```
openai.yaml: 16 entries
anthropic.yaml: 15 entries
google.yaml: 16 entries
xai.yaml: 0 entries
deepseek.yaml: 0 entries
alibaba.yaml: 0 entries
zhipu.yaml: 0 entries
moonshot.yaml: 0 entries
minimax.yaml: 0 entries
bytedance.yaml: 0 entries
```

If any non-zero count differs from the count in `releases.yaml` for that vendor, stop and investigate before continuing.

- [ ] **Step 3: Sanity-check totals**

Run: `node -e "const y=require('js-yaml');const fs=require('fs');const r=y.load(fs.readFileSync('src/data/releases.yaml','utf-8'));const dir='src/data/releases';let t=0;for(const f of fs.readdirSync(dir)){t+=(y.load(fs.readFileSync(dir+'/'+f,'utf-8'))||[]).length}console.log('old',r.length,'new',t)"`

Expected: `old N new N` with the same N. If they differ, the migration dropped or duplicated entries — stop.

- [ ] **Step 4: Spot-check one of the produced files**

Run: `head -20 src/data/releases/openai.yaml`
Expected: a YAML array with `date` ascending (oldest first), each entry having `vendor: openai`.

- [ ] **Step 5: Run the build to confirm nothing broke**

Run: `npm run build`
Expected: build succeeds. (Loader still reads `releases.yaml`; the new files are inert.)

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate-releases.mjs src/data/releases
git commit -m "chore(data): generate per-vendor release files"
```

---

## Task 4: Switch loader, delete old file, delete script

**Files:**
- Modify: `src/lib/loadData.ts`
- Delete: `src/data/releases.yaml`
- Delete: `scripts/migrate-releases.mjs`

- [ ] **Step 1: Rewrite `loadReleases` and `loadAll`**

Replace `src/lib/loadData.ts` so that `loadReleases` reads from the directory and `loadAll` passes the file ids to `crossValidate`. Final file:

```ts
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { vendorsFileSchema, releasesFileSchema, type Vendor, type Release } from '@/lib/schemas';
import { crossValidate } from '@/lib/crossValidate';

const DATA_DIR = path.resolve(process.cwd(), 'src/data');
const RELEASES_DIR = path.join(DATA_DIR, 'releases');

export function loadVendors(): Vendor[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, 'vendors.yaml'), 'utf-8');
  return vendorsFileSchema.parse(yaml.load(raw));
}

export function loadReleasesFromDir(dir: string): { releases: Release[]; fileIds: string[] } {
  const entries = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .sort();
  const fileIds: string[] = [];
  const releases: Release[] = [];
  for (const file of entries) {
    const id = file.slice(0, -'.yaml'.length);
    fileIds.push(id);
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    const parsed = releasesFileSchema.parse(yaml.load(raw) ?? []);
    for (const entry of parsed) {
      if (entry.vendor !== id) {
        throw new Error(
          `releases/${file} entry "${entry.model}" has vendor="${entry.vendor}", expected "${id}"`,
        );
      }
      releases.push(entry);
    }
  }
  return { releases, fileIds };
}

export function loadReleases(): Release[] {
  return loadReleasesFromDir(RELEASES_DIR).releases;
}

export function loadAll(): { vendors: Vendor[]; releases: Release[] } {
  const vendors = loadVendors();
  const { releases, fileIds } = loadReleasesFromDir(RELEASES_DIR);
  crossValidate(vendors, releases, fileIds);
  return { vendors, releases };
}
```

- [ ] **Step 2: Run the unit suite**

Run: `npm test`
Expected: PASS. The new `loadReleases` reads the per-vendor files written in Task 3; counts match what the page expects.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: build succeeds. (At this point both `releases.yaml` and the per-vendor files exist; the loader only uses the latter.)

- [ ] **Step 4: Spot-check the built output**

Run: `npm run preview` in one terminal, then in another: `curl -s http://localhost:4321/the-model-archive/ | grep -c 'col-date'`
Expected: a date-cell count consistent with the previous build (hand-compare to a fresh `npm run build` before this branch if uncertain). Stop the preview server.

This step is a smoke check, not a hard gate — if `curl` is unavailable on the developer's box, opening the page in a browser is acceptable.

- [ ] **Step 5: Delete the old single file and the migration script**

Run:

```bash
git rm src/data/releases.yaml
git rm scripts/migrate-releases.mjs
```

- [ ] **Step 6: Run the full test + build pipeline once more**

Run: `npm test && npm run build`
Expected: PASS for both.

- [ ] **Step 7: Commit**

```bash
git add src/lib/loadData.ts
git commit -m "feat(loader): read releases from per-vendor files, drop releases.yaml"
```

---

## Task 5: Update the Footer data link

**Files:**
- Modify: `src/components/Footer.astro:19`

- [ ] **Step 1: Repoint the Data link**

Edit `src/components/Footer.astro`. Change line 19 from:

```astro
    <a href={`${REPO}/blob/main/src/data/releases.yaml`}>{t.footer.data}</a>
```

to:

```astro
    <a href={`${REPO}/tree/main/src/data/releases`}>{t.footer.data}</a>
```

- [ ] **Step 2: Build and verify the link**

Run: `npm run build`
Expected: build succeeds.

Run: `grep -r "tree/main/src/data/releases" dist/ | head -3`
Expected: at least one match in the built HTML.

- [ ] **Step 3: Commit**

```bash
git add src/components/Footer.astro
git commit -m "fix(footer): point data link to per-vendor releases directory"
```

---

## Task 6: Update README and CLAUDE.md

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update `README.md`**

Replace the "Add a release" section. Final content for lines 5-13:

```markdown
## Add a release

Edit `src/data/releases/<vendor>.yaml` (one file per vendor; create the file by adding the vendor to `src/data/vendors.yaml` first if it does not exist) and submit a PR. Append new entries at the end — each file is sorted by date ascending. Fields:

- `date`: ISO 8601 (YYYY-MM-DD)
- `vendor`: must match the filename and an `id` in `src/data/vendors.yaml`
- `model`: display string
- `description.zh` / `description.en`: one-line
- `link`: official announcement URL (must be https)
```

- [ ] **Step 2: Update `CLAUDE.md` Data flow section**

In `CLAUDE.md`, replace the line:

```
1. `src/data/vendors.yaml` and `src/data/releases.yaml` are the only sources of truth.
```

with:

```
1. `src/data/vendors.yaml` and the per-vendor files under `src/data/releases/` are the only sources of truth. Each file in `releases/` is named after a vendor id (e.g. `releases/openai.yaml`) and contains only releases for that vendor.
```

In the `crossValidate` bullet list, add a new bullet after the existing three:

```
   - the set of `*.yaml` files under `src/data/releases/` exactly equals the set of `id`s in `vendors.yaml`, and every entry's `vendor` field equals its filename
```

- [ ] **Step 3: Update `CLAUDE.md` "Adding a release" section**

Replace the entire "Adding a release" section (lines around 55-57) with:

```markdown
### Adding a release

Edit `src/data/releases/<vendor-id>.yaml` and append a new entry at the end (each file is sorted by `date` ascending). Required fields: `date` (YYYY-MM-DD), `vendor` (must equal the filename), `model`, `description.zh`, `description.en`, `link` (https URL). When adding a new vendor, add it to `vendors.yaml` and create `src/data/releases/<vendor-id>.yaml` (use `[]` if there are no releases yet) — `crossValidate` rejects vendor-id mismatches, filename mismatches, missing release files, duplicates, and far-future dates at build time.
```

- [ ] **Step 4: Sanity-check by reading both files**

Run: `grep -n "releases\.yaml" README.md CLAUDE.md`
Expected: no matches (or only matches inside fenced examples that are intentional). If any active prose still says "releases.yaml", fix it.

- [ ] **Step 5: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: describe per-vendor releases layout"
```

---

## Final verification

- [ ] **Run the whole pipeline**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Confirm git is clean**

Run: `git status`
Expected: `nothing to commit, working tree clean`.

- [ ] **Skim `git log`**

Run: `git log --oneline -8`
Expected: six new commits in this order, newest at top:

```
docs: describe per-vendor releases layout
fix(footer): point data link to per-vendor releases directory
feat(loader): read releases from per-vendor files, drop releases.yaml
chore(data): generate per-vendor release files
feat(crossValidate): assert release files mirror vendors set
feat(loader): add loadReleasesFromDir with filename-vendor invariant
```

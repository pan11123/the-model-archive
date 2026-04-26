# The Model Archive · 模型档案馆

A curated archive of LLM releases from every major AI vendor. Bilingual (zh / en), static site deployed to GitHub Pages.

## Add a release

Edit `src/data/releases/<vendor>.yaml` (one file per vendor; create the file by adding the vendor to `src/data/vendors.yaml` first if it does not exist) and submit a PR. Append new entries at the end — each file is sorted by date ascending. Fields:

- `date`: ISO 8601 (YYYY-MM-DD)
- `vendor`: must match the filename and an `id` in `src/data/vendors.yaml`
- `model`: display string
- `description.zh` / `description.en`: one-line
- `link`: official announcement URL (must be https)

## Local

```bash
npm ci
npm run dev        # http://localhost:4321/the-model-archive/
npm test           # unit tests
npm run test:e2e   # Playwright smoke
npm run build      # writes dist/
```

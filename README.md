# The Model Archive · 模型档案馆

A curated archive of LLM releases from every major AI vendor. Bilingual (zh / en), static site deployed to GitHub Pages.

## Add a release

Edit `src/data/releases/<vendor>.yaml` (one file per vendor; create the file by adding the vendor to `src/data/vendors.yaml` first if it does not exist) and submit a PR. Append new entries at the end — each file is sorted by date ascending. Fields:

- `date`: ISO 8601 (YYYY-MM-DD)
- `vendor`: must match the filename and an `id` in `src/data/vendors.yaml`
- `model`: display string
- `description.zh` / `description.en`: one-line
- `link`: official announcement URL (must be https)

## Collector (auto-discover new releases)

A semi-automatic collector that monitors vendor blogs/RSS, extracts release info via LLM (DeepSeek), and opens PRs for human review.

### Supported vendors

| Vendor | Source | Type |
|---|---|---|
| openai | openai.com/news/rss.xml | RSS |
| anthropic | anthropic.com/news | list |
| google | blog.google AI RSS | RSS |
| deepseek | api-docs.deepseek.com sitemap | sitemap |
| alibaba | qwenlm.github.io/blog | list |
| moonshot | kimi.com/blog | list |
| minimax | minimaxi.com/news | list |

Deferred: xai (Cloudflare), bytedance (JS-rendered).

### Setup

1. Get a DeepSeek API key: https://platform.deepseek.com/
2. Add as GitHub Secret: `DEEPSEEK_API_KEY`
3. Enable Actions permissions: Settings → Actions → Read and write + Allow PR creation

### Local usage

```bash
export DEEPSEEK_API_KEY="your-key"

npm run collect:health                      # check endpoints
npm run collect:dry -- --vendors=deepseek   # dry run
npm run collect -- --vendors=deepseek       # real run
npm run collect:bootstrap -- --vendors=openai  # mark existing URLs as seen
```

### CI

`.github/workflows/collect.yml` runs daily at 02:00 UTC. It discovers new releases, writes candidates to YAML, and opens a PR for review. Manual trigger available via `workflow_dispatch`.

## Local

```bash
npm ci
npm run dev        # http://localhost:4321/the-model-archive/
npm test           # unit tests
npm run test:e2e   # Playwright smoke
npm run build      # writes dist/
```

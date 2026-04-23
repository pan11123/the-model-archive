# AI Release Log

Curated timeline of major AI vendor LLM releases. Bilingual (zh / en), static site deployed to GitHub Pages.

## Add a release

Edit `src/data/releases.yaml` and submit a PR. Fields:

- `date`: ISO 8601 (YYYY-MM-DD)
- `vendor`: must match an `id` in `src/data/vendors.yaml`
- `model`: display string
- `description.zh` / `description.en`: one-line
- `link`: official announcement URL (must be https)

## Local

```bash
npm ci
npm run dev        # http://localhost:4321/ai-release-log/
npm test           # unit tests
npm run test:e2e   # Playwright smoke
npm run build      # writes dist/
```

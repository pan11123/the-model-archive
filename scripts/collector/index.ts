import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { adapters } from './vendors/index.js';
import { discoverRss } from './discover/rss.js';
import { discoverList } from './discover/playwright-list.js';
import { discoverSitemap } from './discover/sitemap.js';
import { fetchArticle } from './fetch/playwright-article.js';
import { extractRelease } from './extract/client.js';
import { loadState, saveState, isSeen, markSeen, updateLastRun, appendDiscarded, filterNewUrls } from './state.js';
import { writeCandidatesToYaml } from './emit/yaml-writer.js';
import { generatePrBody } from './emit/pr-body.js';
import type { VendorAdapter, DiscoveredItem, Candidate, RunSummary } from './types.js';

const PR_BODY_PATH = path.resolve(process.cwd(), '.collector-pr-body.md');

interface CliArgs {
  vendors?: string[];
  bootstrap: boolean;
  dryRun: boolean;
  healthCheck: boolean;
  limit: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = { bootstrap: false, dryRun: false, healthCheck: false, limit: 10 };

  for (const arg of args) {
    if (arg.startsWith('--vendors=')) {
      result.vendors = arg.slice('--vendors='.length).split(',').map((s) => s.trim());
    } else if (arg === '--bootstrap') {
      result.bootstrap = true;
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--health-check') {
      result.healthCheck = true;
    } else if (arg.startsWith('--limit=')) {
      result.limit = parseInt(arg.slice('--limit='.length), 10);
    }
  }

  // Also read from env vars (used by GitHub Actions)
  if (!result.vendors && process.env.COLLECTOR_VENDORS) {
    result.vendors = process.env.COLLECTOR_VENDORS.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (process.env.COLLECTOR_BOOTSTRAP === 'true') {
    result.bootstrap = true;
  }

  return result;
}

function filterAdapters(args: CliArgs): VendorAdapter[] {
  if (!args.vendors || args.vendors.length === 0) return adapters;
  return adapters.filter((a) => args.vendors!.includes(a.id));
}

async function discover(adapter: VendorAdapter): Promise<DiscoveredItem[]> {
  if (adapter.discover.type === 'rss') {
    return discoverRss(adapter.discover.url);
  }
  if (adapter.discover.type === 'sitemap') {
    return discoverSitemap(adapter.discover.url, adapter.discover.pathFilter);
  }
  return discoverList(
    adapter.discover.url,
    adapter.discover.linkSelector,
    adapter.discover.linkPrefix,
  );
}

function applyHints(items: DiscoveredItem[], adapter: VendorAdapter): DiscoveredItem[] {
  let filtered = items;

  if (adapter.urlFilter) {
    filtered = filtered.filter((item) => adapter.urlFilter!(item.url));
  }

  if (adapter.releaseHints?.excludeKeywords?.length) {
    const excluded = adapter.releaseHints.excludeKeywords;
    filtered = filtered.filter((item) => {
      const lower = item.title.toLowerCase();
      return !excluded.some((kw) => lower.includes(kw.toLowerCase()));
    });
  }

  return filtered;
}

async function runHealthCheck(args: CliArgs): Promise<void> {
  const targets = filterAdapters(args);
  console.log(`Health check: testing ${targets.length} adapters...\n`);

  for (const adapter of targets) {
    try {
      const items = await discover(adapter);
      console.log(`  ✅ ${adapter.id}: ${items.length} items found`);
    } catch (err) {
      console.error(`  ❌ ${adapter.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function runBootstrap(args: CliArgs): Promise<void> {
  const targets = filterAdapters(args);
  const state = loadState();
  console.log(`Bootstrap: marking all existing URLs as seen for ${targets.length} vendors...\n`);

  for (const adapter of targets) {
    try {
      const items = await discover(adapter);
      for (const item of items) {
        markSeen(state, adapter.id, item.url);
      }
      updateLastRun(state, adapter.id);
      console.log(`  ✅ ${adapter.id}: ${items.length} URLs marked as seen`);
    } catch (err) {
      console.error(`  ❌ ${adapter.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  saveState(state);
  console.log('\nBootstrap complete. state.json updated.');
}

async function runCollect(args: CliArgs): Promise<void> {
  const targets = filterAdapters(args);
  const state = loadState();
  const summary: RunSummary = {
    vendorCount: targets.length,
    discovered: 0,
    afterDedup: 0,
    extracted: 0,
    written: 0,
    skipped: 0,
    failed: 0,
    candidates: [],
    failures: [],
    discarded: [],
  };

  console.log(`Collecting from ${targets.length} vendors (dryRun=${args.dryRun})...\n`);

  for (const adapter of targets) {
    console.log(`[${adapter.id}] discovering...`);
    let items: DiscoveredItem[];
    try {
      items = await discover(adapter);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ discover failed: ${msg}`);
      summary.failures.push({ vendor: adapter.id, url: '(discover)', error: msg });
      continue;
    }

    items = applyHints(items, adapter);
    summary.discovered += items.length;
    console.log(`  found ${items.length} items after hints`);

    const newUrls = filterNewUrls(state, adapter.id, items.map((i) => i.url));
    summary.afterDedup += newUrls.length;
    console.log(`  ${newUrls.length} new after dedup`);

    const newItems = items.filter((i) => newUrls.includes(i.url)).slice(0, args.limit);

    for (const item of newItems) {
      console.log(`  processing: ${item.url}`);
      try {
        const article = await fetchArticle(item.url);
        summary.extracted++;

        const extraction = await extractRelease({
          vendor: adapter.id,
          title: article.title || item.title,
          publishedAt: item.publishedAt,
          content: article.plainText,
        });

        if (!extraction.isRelease) {
          console.log(`    not a release (confidence: ${extraction.confidence})`);
          summary.discarded.push({ vendor: adapter.id, url: item.url, reason: `not release (${extraction.confidence.toFixed(2)})` });
          markSeen(state, adapter.id, item.url);
          appendDiscarded(adapter.id, item.url, `not release (${extraction.confidence.toFixed(2)})`);
          continue;
        }

        if (extraction.confidence < 0.7) {
          console.log(`    low confidence: ${extraction.confidence.toFixed(2)}, skipping yaml write`);
          summary.candidates.push({ vendor: adapter.id, url: item.url, title: item.title, publishedAt: item.publishedAt, extraction });
          markSeen(state, adapter.id, item.url);
          summary.skipped++;
          continue;
        }

        console.log(`    ✅ release: ${extraction.model} (confidence: ${extraction.confidence.toFixed(2)})`);
        summary.candidates.push({ vendor: adapter.id, url: item.url, title: item.title, publishedAt: item.publishedAt, extraction });
        markSeen(state, adapter.id, item.url);
        summary.written++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`    ❌ failed: ${msg}`);
        summary.failures.push({ vendor: adapter.id, url: item.url, error: msg });
      }
    }

    updateLastRun(state, adapter.id);
  }

  let writtenCandidates: Candidate[] = [];
  let skippedCandidates: Candidate[] = [];

  if (!args.dryRun) {
    const highAndMedium = summary.candidates.filter((c) => c.extraction.confidence >= 0.7 && c.extraction.isRelease);
    if (highAndMedium.length > 0) {
      console.log(`\nWriting ${highAndMedium.length} candidates to YAML...`);
      const result = writeCandidatesToYaml(highAndMedium);
      writtenCandidates = result.written;
      skippedCandidates = result.skipped;
      summary.written = writtenCandidates.length;
      summary.skipped += skippedCandidates.length;

      try {
        const { loadAll } = await import(path.resolve(process.cwd(), 'src/lib/loadData.ts'));
        loadAll();
        console.log('✅ loadAll() validation passed');
      } catch (err) {
        console.error(`❌ loadAll() validation FAILED: ${err instanceof Error ? err.message : String(err)}`);
        console.error('Aborting: state not saved, PR not created');
        process.exit(1);
      }
    }

    saveState(state);
    console.log('State saved.');
  } else {
    console.log('\n[dry-run] Skipping YAML write and state save');
  }

  const prBody = generatePrBody(summary, writtenCandidates, skippedCandidates);
  writeFileSync(PR_BODY_PATH, prBody, 'utf8');
  console.log(`\nPR body written to ${PR_BODY_PATH}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, prBody, { flag: 'a' });
  }

  const count = summary.candidates.filter((c) => c.extraction.isRelease).length;
  console.log(`\n--- Summary ---`);
  console.log(`Vendors: ${summary.vendorCount}`);
  console.log(`Discovered: ${summary.discovered}`);
  console.log(`After dedup: ${summary.afterDedup}`);
  console.log(`Extracted: ${summary.extracted}`);
  console.log(`Written: ${summary.written}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Failed: ${summary.failures.length}`);

  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `count=${count}\ntitle=collector: ${count} candidate(s) (${new Date().toISOString().slice(0, 10)})\n`, { flag: 'a' });
  }
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.healthCheck) {
    await runHealthCheck(args);
    return;
  }

  if (args.bootstrap) {
    await runBootstrap(args);
    return;
  }

  await runCollect(args);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

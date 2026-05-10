import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { Candidate } from '../types.js';

const RELEASES_DIR = path.resolve(process.cwd(), 'src/data/releases');
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getExistingKeys(filePath: string): Set<string> {
  const doc = YAML.parseDocument(readFileSync(filePath, 'utf8'));
  const items = doc.contents as YAML.YAMLSeq;
  const keys = new Set<string>();
  for (const item of items.items as YAML.YAMLMap[]) {
    const date = item.get('date') as string;
    const vendor = item.get('vendor') as string;
    const model = item.get('model') as string;
    keys.add(`${vendor}|${model}|${date}`);
  }
  return keys;
}

function getExistingModels(filePath: string): string[] {
  const doc = YAML.parseDocument(readFileSync(filePath, 'utf8'));
  const items = doc.contents as YAML.YAMLSeq;
  const models: string[] = [];
  for (const item of items.items as YAML.YAMLMap[]) {
    models.push((item.get('model') as string).toLowerCase());
  }
  return models;
}

export function writeCandidatesToYaml(candidates: Candidate[]): { written: Candidate[]; skipped: Candidate[] } {
  const byVendor = new Map<string, Candidate[]>();
  for (const c of candidates) {
    if (!byVendor.has(c.vendor)) byVendor.set(c.vendor, []);
    byVendor.get(c.vendor)!.push(c);
  }

  const written: Candidate[] = [];
  const skipped: Candidate[] = [];

  for (const [vendor, vendorCandidates] of byVendor) {
    const filePath = path.join(RELEASES_DIR, `${vendor}.yaml`);
    const doc = YAML.parseDocument(readFileSync(filePath, 'utf8'));
    const items = doc.contents as YAML.YAMLSeq;
    const existingKeys = getExistingKeys(filePath);
    const existingModels = getExistingModels(filePath);

    for (const candidate of vendorCandidates) {
      if (candidate.extraction.releaseDate == null || candidate.extraction.model == null || !DATE_RE.test(candidate.extraction.releaseDate)) {
        console.log(`  ⏭️ skipping candidate with null/invalid date or null model: ${candidate.url} (date=${candidate.extraction.releaseDate})`);
        skipped.push(candidate);
        continue;
      }
      const key = `${candidate.vendor}|${candidate.extraction.model}|${candidate.extraction.releaseDate}`;
      if (existingKeys.has(key)) {
        console.log(`  ⏭️ skipping duplicate: ${key}`);
        skipped.push(candidate);
        continue;
      }
      // Warn if model name matches an existing entry (different date) — LLM may have normalized a variant name
      if (existingModels.includes(candidate.extraction.model.toLowerCase())) {
        console.log(`  ⚠️ model "${candidate.extraction.model}" already exists with a different date — LLM may have normalized a variant name, check URL: ${candidate.url}`);
      }

      const node = doc.createNode({
        date: candidate.extraction.releaseDate,
        vendor: candidate.vendor,
        model: candidate.extraction.model,
        description: {
          zh: candidate.extraction.descriptionZh,
          en: candidate.extraction.descriptionEn,
        },
        link: candidate.url,
      });
      insertByDate(items, node);
      existingKeys.add(key);
      written.push(candidate);
    }

    writeFileSync(filePath, doc.toString({
      lineWidth: 0,
      defaultStringType: 'PLAIN',
      defaultKeyType: 'PLAIN',
    }), 'utf8');
  }

  return { written, skipped };
}

function insertByDate(items: YAML.YAMLSeq, node: YAML.YAMLMap): void {
  const newDate = node.get('date') as string;
  const itemsArr = items.items as YAML.YAMLMap[];

  let insertIdx = itemsArr.length;
  for (let i = 0; i < itemsArr.length; i++) {
    const existingDate = itemsArr[i].get('date') as string;
    if (newDate < existingDate) {
      insertIdx = i;
      break;
    }
  }
  items.items.splice(insertIdx, 0, node);
}

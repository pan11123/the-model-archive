import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { Candidate } from '../types.js';

const RELEASES_DIR = path.resolve(process.cwd(), 'src/data/releases');

export function writeCandidatesToYaml(candidates: Candidate[]): void {
  const byVendor = new Map<string, Candidate[]>();
  for (const c of candidates) {
    if (!byVendor.has(c.vendor)) byVendor.set(c.vendor, []);
    byVendor.get(c.vendor)!.push(c);
  }

  for (const [vendor, vendorCandidates] of byVendor) {
    const filePath = path.join(RELEASES_DIR, `${vendor}.yaml`);
    const doc = YAML.parseDocument(readFileSync(filePath, 'utf8'));
    const items = doc.contents as YAML.YAMLSeq;

    for (const candidate of vendorCandidates) {
      const node = doc.createNode({
        date: candidate.extraction.releaseDate!,
        vendor: candidate.vendor,
        model: candidate.extraction.model!,
        description: {
          zh: candidate.extraction.descriptionZh,
          en: candidate.extraction.descriptionEn,
        },
        link: candidate.url,
      });
      insertByDate(items, node);
    }

    writeFileSync(filePath, doc.toString({
      lineWidth: 0,
      defaultStringType: 'PLAIN',
      defaultKeyType: 'PLAIN',
    }), 'utf8');
  }
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

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
  for (const r of list) {
    r.date = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date);
  }
  list.sort((a, b) => a.date.localeCompare(b.date));
  const body = list.length === 0 ? '[]\n' : yaml.dump(list, { lineWidth: -1, noRefs: true });
  fs.writeFileSync(path.join(OUT, `${id}.yaml`), body);
  console.log(`${id}.yaml: ${list.length} entries`);
}

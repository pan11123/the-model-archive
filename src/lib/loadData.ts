import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { vendorsFileSchema, releasesFileSchema, type Vendor, type Release } from '@/lib/schemas';

const DATA_DIR = path.resolve(process.cwd(), 'src/data');

export function loadVendors(): Vendor[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, 'vendors.yaml'), 'utf-8');
  return vendorsFileSchema.parse(yaml.load(raw));
}

export function loadReleases(): Release[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, 'releases.yaml'), 'utf-8');
  return releasesFileSchema.parse(yaml.load(raw));
}

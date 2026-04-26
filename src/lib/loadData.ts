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

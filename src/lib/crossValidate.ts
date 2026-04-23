import type { Vendor, Release } from '@/lib/schemas';

export function crossValidate(vendors: Vendor[], releases: Release[]): void {
  const vendorIds = new Set(vendors.map((v) => v.id));
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

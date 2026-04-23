import type { Release, Vendor } from '@/lib/schemas';

export interface MatrixRow {
  date: string;
  cells: Record<string, Release[]>;
}

export interface Matrix {
  columns: Vendor[];
  rows: MatrixRow[];
}

export function buildMatrix(
  releases: Release[],
  vendors: Vendor[],
  selectedVendorIds: Set<string>,
): Matrix {
  const filtered = releases.filter((r) => selectedVendorIds.has(r.vendor));

  const vendorIdsWithData = new Set(filtered.map((r) => r.vendor));
  const columns = vendors.filter((v) => vendorIdsWithData.has(v.id));

  const byDate = new Map<string, MatrixRow>();
  for (const r of filtered) {
    let row = byDate.get(r.date);
    if (!row) {
      row = { date: r.date, cells: {} };
      byDate.set(r.date, row);
    }
    (row.cells[r.vendor] ||= []).push(r);
  }

  const rows = [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  return { columns, rows };
}

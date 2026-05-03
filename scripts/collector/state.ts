import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const STATE_PATH = path.resolve(import.meta.dirname, 'state.json');
const DISCARDED_PATH = path.resolve(import.meta.dirname, 'discarded.log');

export interface VendorState {
  seenUrls: string[];
  lastRun: string;
}

export interface CollectorState {
  version: 1;
  vendors: Record<string, VendorState>;
}

export function loadState(): CollectorState {
  if (!existsSync(STATE_PATH)) {
    return { version: 1, vendors: {} };
  }
  return JSON.parse(readFileSync(STATE_PATH, 'utf8')) as CollectorState;
}

export function saveState(state: CollectorState): void {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

export function isSeen(state: CollectorState, vendorId: string, url: string): boolean {
  return state.vendors[vendorId]?.seenUrls.includes(url) ?? false;
}

export function markSeen(state: CollectorState, vendorId: string, url: string): void {
  if (!state.vendors[vendorId]) {
    state.vendors[vendorId] = { seenUrls: [], lastRun: '' };
  }
  if (!state.vendors[vendorId].seenUrls.includes(url)) {
    state.vendors[vendorId].seenUrls.push(url);
  }
}

export function updateLastRun(state: CollectorState, vendorId: string): void {
  if (!state.vendors[vendorId]) {
    state.vendors[vendorId] = { seenUrls: [], lastRun: '' };
  }
  state.vendors[vendorId].lastRun = new Date().toISOString();
}

export function appendDiscarded(vendor: string, url: string, reason: string): void {
  const line = `${new Date().toISOString()}\t${vendor}\t${url}\t${reason}\n`;
  writeFileSync(DISCARDED_PATH, line, { flag: 'a' });
}

export function filterNewUrls(
  state: CollectorState,
  vendorId: string,
  urls: string[],
): string[] {
  return urls.filter((url) => !isSeen(state, vendorId, url));
}

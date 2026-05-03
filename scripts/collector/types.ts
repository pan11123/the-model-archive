export type DiscoverConfig =
  | { type: 'rss'; url: string }
  | {
      type: 'list';
      url: string;
      linkSelector: string;
      linkPrefix?: string;
    }
  | { type: 'sitemap'; url: string; pathFilter: (url: string) => boolean };

export interface VendorAdapter {
  id: string;
  discover: DiscoverConfig;
  releaseHints?: {
    titleKeywords?: string[];
    excludeKeywords?: string[];
  };
  urlFilter?: (url: string) => boolean;
}

export interface DiscoveredItem {
  url: string;
  title: string;
  publishedAt?: string;
}

export interface FetchedArticle {
  url: string;
  html: string;
  plainText: string;
  title: string;
}

export interface ExtractionResult {
  isRelease: boolean;
  confidence: number;
  model: string | null;
  releaseDate: string | null;
  descriptionZh: string;
  descriptionEn: string;
  reasoning: string;
}

export interface Candidate {
  vendor: string;
  url: string;
  title: string;
  publishedAt?: string;
  extraction: ExtractionResult;
}

export interface RunSummary {
  vendorCount: number;
  discovered: number;
  afterDedup: number;
  extracted: number;
  written: number;
  skipped: number;
  failed: number;
  candidates: Candidate[];
  failures: { vendor: string; url: string; error: string }[];
  discarded: { vendor: string; url: string; reason: string }[];
}

export interface Metrics {
  impressions: number;
  clicks: number;
  /** clicks / impressions x 100, computed by the server from aggregate totals; null when impressions are 0. */
  ctr: number | null;
  storeAttempts: number;
  storeLaunched: number;
  storeFailures: number;
  lastActivityUtc: string | null;
}
export interface Game { gameId: string; displayName: string; shortTitle: string | null; packageName: string; asin: string | null; storeUrl: string | null; thumbUrl: string | null }
export interface Row { id: string; name: string; packageName: string | null; thumbUrl: string | null; inInventory: boolean; metrics: Metrics }
export interface Freshness { serverTimeUtc: string; latestEventOccurredUtc: string | null; latestUploadReceivedUtc: string | null }
export interface Daily { date: string; metrics: Metrics }
export interface Breakdown { key: string; metrics: Metrics }

export interface Meta { defaultTimeZone: string; games: Game[]; formats: string[]; orientations: string[]; placements: string[]; campaigns: string[]; freshness: Freshness }

export interface Overview {
  freshness: Freshness; totals: Metrics; gamesWithActivity: number; hostGamesWithActivity: number; totalGames: number;
  daily: Daily[]; games: Row[]; hosts: Row[]; formats: Breakdown[]; topGames: Row[];
}
export interface Detail {
  freshness: Freshness; role: 'advertised' | 'host';
  game: { gameId?: string; displayName: string; packageName: string | null; thumbUrl: string | null };
  inInventory: boolean; totals: Metrics; daily: Daily[]; byOtherGame: Row[]; otherGameLabel: string;
  byFormat: Breakdown[]; byPlacement: Breakdown[]; byCreative: Breakdown[]; byOrientation: Breakdown[];
}
export interface Diagnostics {
  freshness: Freshness;
  last30Days: { accepted: number; duplicatesIgnored: number; rejected: number; clockSkewed: number; averageUploadDelaySeconds: number | null; maxUploadDelaySeconds: number };
  perDay: { receivedDate: string; accepted: number; duplicates: number; rejected: number; skewed: number; latestReceivedUtc: string | null }[];
  rejectedReasons: { reason: string; count: number; lastUtc: string }[];
  ingestErrorKinds: { kind: string; count: number }[];
  recentIngestErrors: { received_utc: string; kind: string; status: number; detail: string | null }[];
  aggregateBuckets: { productionBuckets: number; testBuckets: number };
  sdkVersionsInRawEvents: { version: string; events: number }[];
}

export interface FilterState {
  preset: 'today' | 'yesterday' | '7d' | '30d' | 'custom';
  from: string; to: string;           // used when preset = custom
  tz: string;
  target: string; host: string;       // '' = all
  format: string; orientation: string; placement: string;
  env: 'production' | 'test' | 'all';
}

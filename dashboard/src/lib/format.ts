const nf = new Intl.NumberFormat('en-US');

export const fmtInt = (n: number): string => nf.format(n);

/** CTR is shown as a percentage; "—" (not 0%) when there were no impressions. Never capped. */
export function fmtCtr(ctr: number | null): string {
  if (ctr === null) return '—';
  return `${ctr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export const FORMAT_LABEL: Record<string, string> = { banner: 'Banner', mrec: 'MREC', interstitial: 'Interstitial' };
export const formatLabel = (k: string): string => FORMAT_LABEL[k] ?? k;

export function fmtDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 90) return `${Math.round(seconds)} s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`;
  if (seconds < 172800) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / 86400).toFixed(1)} days`;
}

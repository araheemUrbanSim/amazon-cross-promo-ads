/** Calendar helpers that work in an arbitrary IANA time zone (the dashboard default is Asia/Karachi). */

export function isValidTimeZone(tz: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

/** Calendar date (YYYY-MM-DD) of `now` in the zone. en-CA formats dates as ISO. */
export function todayIn(tz: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export type Preset = 'today' | 'yesterday' | '7d' | '30d' | 'custom';

export function presetRange(preset: Preset, tz: string, custom: { from: string; to: string }, now = new Date()): { from: string; to: string } {
  const today = todayIn(tz, now);
  switch (preset) {
    case 'today': return { from: today, to: today };
    case 'yesterday': { const y = addDays(today, -1); return { from: y, to: y }; }
    case '7d': return { from: addDays(today, -6), to: today };
    case '30d': return { from: addDays(today, -29), to: today };
    default: return custom;
  }
}

export function formatDateTime(iso: string | null, tz: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

export function formatDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short' }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function tzLabel(tz: string, now = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(now).find(p => p.type === 'timeZoneName');
    return `${tz.replace(/_/g, ' ')} (${part?.value ?? ''})`;
  } catch { return tz; }
}

export function allTimeZones(): string[] {
  const common = ['Asia/Karachi', 'UTC'];
  let all: string[] = [];
  try { all = (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone'); } catch { /* older browsers */ }
  return [...new Set([...common, ...all])];
}

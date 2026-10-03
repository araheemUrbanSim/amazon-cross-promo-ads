import { Detail, Diagnostics, FilterState, Meta, Overview } from './types';
import { presetRange } from '../lib/time';

export type ApiErrorKind = 'auth' | 'network' | 'server' | 'bad_request' | 'rate_limited' | 'not_configured';

export class ApiError extends Error {
  constructor(public kind: ApiErrorKind, message: string, public status = 0) { super(message); }
}

export interface ApiClient {
  check(): Promise<{ ok: boolean; role: 'admin' | 'reader' }>;
  meta(): Promise<Meta>;
  overview(f: FilterState): Promise<Overview>;
  detail(role: 'games' | 'hosts', id: string, f: FilterState): Promise<Detail>;
  diagnostics(): Promise<Diagnostics>;
  exportCsv(view: string, f: FilterState): Promise<{ blob: Blob; filename: string }>;
}

export function filterParams(f: FilterState, skip: string[] = []): URLSearchParams {
  const r = presetRange(f.preset, f.tz, { from: f.from, to: f.to });
  const q = new URLSearchParams({ from: r.from, to: r.to, tz: f.tz, env: f.env });
  const add = (k: string, v: string) => { if (v && !skip.includes(k)) q.set(k, v); };
  add('target', f.target); add('host', f.host); add('format', f.format);
  add('orientation', f.format === 'banner' || f.format === 'mrec' ? '' : f.orientation); add('placement', f.placement);
  return q;
}

export function createApiClient(baseUrl: string, getToken: () => string | null, fetchImpl: typeof fetch = (...a) => fetch(...a)): ApiClient {
  const base = baseUrl.replace(/\/+$/, '');

  async function request(path: string, params?: URLSearchParams): Promise<Response> {
    if (!base) throw new ApiError('not_configured', 'The analytics server URL is not configured.');
    const token = getToken();
    let res: Response;
    try {
      res = await fetchImpl(`${base}${path}${params ? `?${params}` : ''}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: 'no-store' });
    } catch {
      throw new ApiError('network', 'Could not reach the analytics server.');
    }
    if (res.status === 401 || res.status === 403) throw new ApiError('auth', 'Your access key was not accepted.', res.status);
    if (res.status === 429) throw new ApiError('rate_limited', 'Too many requests. Wait a minute and retry.', 429);
    if (res.status === 400) throw new ApiError('bad_request', await safeError(res), 400);
    if (!res.ok) throw new ApiError('server', `The analytics server returned an error (${res.status}).`, res.status);
    return res;
  }
  async function json<T>(path: string, params?: URLSearchParams): Promise<T> {
    const res = await request(path, params);
    try { return (await res.json()) as T; } catch { throw new ApiError('server', 'The analytics server sent an unreadable response.', res.status); }
  }

  return {
    check: () => json('/v1/auth/check'),
    meta: () => json('/v1/reports/meta'),
    overview: f => json('/v1/reports/overview', filterParams(f)),
    detail: (role, id, f) => json(`/v1/reports/${role}/${encodeURIComponent(id)}`, filterParams(f, role === 'games' ? ['target'] : ['host'])),
    diagnostics: () => json('/v1/reports/diagnostics'),
    async exportCsv(view, f) {
      const q = filterParams(f); q.set('view', view);
      const res = await request('/v1/reports/export.csv', q);
      const cd = res.headers.get('content-disposition') ?? '';
      const m = /filename="([^"]+)"/.exec(cd);
      return { blob: await res.blob(), filename: m ? m[1] : `iconic-ads-${view}.csv` };
    }
  };
}

async function safeError(res: Response): Promise<string> {
  try { const j = await res.json() as { error?: string }; return j.error ?? 'Invalid request.'; } catch { return 'Invalid request.'; }
}

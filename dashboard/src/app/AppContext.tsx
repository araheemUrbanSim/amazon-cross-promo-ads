import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClient, ApiError, createApiClient } from '../api/client';
import { FilterState, Meta } from '../api/types';
import { PublicConfig } from '../lib/config';
import { isValidTimeZone } from '../lib/time';

const TOKEN_KEY = 'ica.token';
const FILTER_KEY = 'ica.filters';

/** The access key lives in sessionStorage only (cleared when the tab closes) and is sent as a Bearer header. */
function readToken(): string | null {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function writeToken(t: string | null): void {
  try { if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
}

export function defaultFilters(tz: string): FilterState {
  return { preset: '7d', from: '', to: '', tz, target: '', host: '', format: '', orientation: '', placement: '', env: 'production' };
}

function readFilters(tz: string): FilterState {
  const base = defaultFilters(tz);
  try {
    const raw = sessionStorage.getItem(FILTER_KEY);
    if (!raw) return base;
    const f = { ...base, ...(JSON.parse(raw) as Partial<FilterState>) };
    if (!isValidTimeZone(f.tz)) f.tz = tz;
    return f;
  } catch { return base; }
}

export interface AppState {
  config: PublicConfig;
  api: ApiClient;
  signedIn: boolean;
  role: 'admin' | 'reader' | null;
  authMessage: string | null;
  login(token: string): Promise<void>;
  logout(message?: string): void;
  filters: FilterState;
  setFilters(patch: Partial<FilterState>): void;
  resetFilters(): void;
  meta: Meta | null;
  metaError: ApiError | null;
  reloadMeta(): void;
  refreshKey: number;
  refresh(): void;
  lastUpdated: Date | null;
  markUpdated(): void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}

export function AppProvider({ config, children, apiOverride }: { config: PublicConfig; children: ReactNode; apiOverride?: ApiClient }) {
  const tokenRef = useRef<string | null>(readToken());
  const [signedIn, setSignedIn] = useState(tokenRef.current !== null);
  const [role, setRole] = useState<'admin' | 'reader' | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<FilterState>(() => readFilters(config.defaultTimeZone));
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaError, setMetaError] = useState<ApiError | null>(null);
  const [metaTick, setMetaTick] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const api = useMemo(() => apiOverride ?? createApiClient(config.apiBaseUrl, () => tokenRef.current), [config.apiBaseUrl, apiOverride]);

  const logout = useCallback((message?: string) => {
    tokenRef.current = null; writeToken(null);
    setSignedIn(false); setRole(null); setMeta(null); setAuthMessage(message ?? null);
  }, []);

  const login = useCallback(async (token: string) => {
    tokenRef.current = token.trim();
    try {
      const r = await api.check();
      writeToken(tokenRef.current);
      setRole(r.role); setSignedIn(true); setAuthMessage(null); setLastUpdated(new Date());
    } catch (e) {
      tokenRef.current = null;
      throw e;
    }
  }, [api]);

  const setFilters = useCallback((patch: Partial<FilterState>) => {
    setFiltersState(prev => {
      const next = { ...prev, ...patch };
      try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const resetFilters = useCallback(() => {
    const d = defaultFilters(config.defaultTimeZone);
    setFiltersState(d);
    try { sessionStorage.removeItem(FILTER_KEY); } catch { /* ignore */ }
  }, [config.defaultTimeZone]);

  // Game inventory for the filter lists. Loaded once per sign-in (and on retry).
  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    setMetaError(null);
    api.meta().then(m => { if (live) { setMeta(m); setRole(r => r ?? 'reader'); setLastUpdated(new Date()); } })
      .catch((e: unknown) => {
        if (!live) return;
        const err = e instanceof ApiError ? e : new ApiError('server', 'Unexpected error.');
        if (err.kind === 'auth') logout('Your session is no longer valid. Sign in again.');
        else setMetaError(err);
      });
    return () => { live = false; };
  }, [signedIn, api, logout, metaTick]);

  const value: AppState = {
    config, api, signedIn, role, authMessage, login, logout, filters, setFilters, resetFilters, meta, metaError,
    reloadMeta: () => setMetaTick(t => t + 1), refreshKey, refresh: () => setRefreshKey(k => k + 1),
    lastUpdated, markUpdated: () => setLastUpdated(new Date())
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

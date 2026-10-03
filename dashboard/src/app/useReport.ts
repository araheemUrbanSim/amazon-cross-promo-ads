import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { useApp } from './AppContext';

export interface Report<T> { data: T | null; error: ApiError | null; loading: boolean; reload(): void }

/**
 * Loads one report. A failed request never leaves old numbers on screen and never turns into zeros:
 * `data` is null and `error` says why (auth, network, server...). Header refresh re-runs every report.
 */
export function useReport<T>(fetcher: () => Promise<T>, deps: DependencyList): Report<T> {
  const { refreshKey, markUpdated, logout } = useApp();
  const [state, setState] = useState<{ data: T | null; error: ApiError | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  useEffect(() => {
    const mine = ++seq.current;
    setState(s => ({ ...s, loading: true, error: null }));
    fetchRef.current().then(
      data => { if (mine === seq.current) { setState({ data, error: null, loading: false }); markUpdated(); } },
      (e: unknown) => {
        if (mine !== seq.current) return;
        const err = e instanceof ApiError ? e : new ApiError('server', 'Unexpected error.');
        if (err.kind === 'auth') { logout('Your access key was rejected. Sign in again.'); return; }
        setState({ data: null, error: err, loading: false });
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey, tick]);

  const reload = useCallback(() => setTick(t => t + 1), []);
  return { ...state, reload };
}

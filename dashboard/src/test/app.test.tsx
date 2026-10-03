import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ThemeProvider } from '@mui/material';
import { App } from '../App';
import { AppProvider } from '../app/AppContext';
import { ApiClient, ApiError, filterParams } from '../api/client';
import { Metrics, Overview, Row, Meta, FilterState } from '../api/types';
import { GamesTable } from '../components/GamesTable';
import { MemoryRouter } from 'react-router-dom';
import { theme } from '../theme';
import { fmtCtr } from '../lib/format';
import { addDays, presetRange, todayIn } from '../lib/time';

const m = (impressions: number, clicks: number, last: string | null = null): Metrics => ({
  impressions, clicks, ctr: impressions > 0 ? (clicks / impressions) * 100 : null, storeAttempts: 0, storeLaunched: 0, storeFailures: 0, lastActivityUtc: last
});
const row = (id: string, name: string, mm: Metrics): Row => ({ id, name, packageName: `com.x.${id}`, thumbUrl: null, inInventory: true, metrics: mm });

const meta: Meta = {
  defaultTimeZone: 'Asia/Karachi', formats: ['banner', 'mrec', 'interstitial'], orientations: ['portrait', 'landscape'], placements: ['main_menu'], campaigns: [],
  games: [{ gameId: 'a', displayName: 'Alpha Game', shortTitle: null, packageName: 'com.x.a', asin: null, storeUrl: null, thumbUrl: null }],
  freshness: { serverTimeUtc: '2026-10-10T12:00:00Z', latestEventOccurredUtc: null, latestUploadReceivedUtc: null }
};
const overview = (totals: Metrics, games: Row[]): Overview => ({
  freshness: { serverTimeUtc: '2026-10-10T12:00:00Z', latestEventOccurredUtc: '2026-10-10T11:00:00Z', latestUploadReceivedUtc: '2026-10-10T11:05:00Z' },
  totals, gamesWithActivity: games.filter(g => g.metrics.impressions > 0).length, hostGamesWithActivity: 0, totalGames: games.length,
  daily: [{ date: '2026-10-09', metrics: totals }, { date: '2026-10-10', metrics: m(0, 0) }], games, hosts: [],
  formats: [{ key: 'banner', metrics: totals }], topGames: games.filter(g => g.metrics.impressions > 0)
});

function fakeApi(over: Partial<ApiClient> = {}): ApiClient {
  return {
    check: vi.fn().mockResolvedValue({ ok: true, role: 'reader' }),
    meta: vi.fn().mockResolvedValue(meta),
    overview: vi.fn().mockResolvedValue(overview(m(200, 5), [row('a', 'Alpha Game', m(200, 5, '2026-10-10T11:00:00Z')), row('b', 'Beta Game', m(0, 0))])),
    detail: vi.fn(), diagnostics: vi.fn(), exportCsv: vi.fn(), ...over
  } as ApiClient;
}

function mount(api: ApiClient, signedIn = true) {
  if (signedIn) sessionStorage.setItem('ica.token', 'test-token-1234567890');
  return render(
    <ThemeProvider theme={theme}>
      <AppProvider config={{ apiBaseUrl: 'http://api.test', defaultTimeZone: 'Asia/Karachi', environmentLabel: '' }} apiOverride={api}><App /></AppProvider>
    </ThemeProvider>
  );
}

describe('formatting and time', () => {
  it('shows an em dash, never 0%, when there are no impressions; does not cap above 100%', () => {
    expect(fmtCtr(null)).toBe('—');
    expect(fmtCtr(0)).toBe('0.00%');
    expect(fmtCtr(300)).toBe('300.00%');
    expect(fmtCtr(5.2227)).toBe('5.22%');
  });
  it('resolves presets in the selected time zone (Karachi is already tomorrow at 20:00Z)', () => {
    const now = new Date('2026-10-10T20:00:00Z');
    expect(todayIn('Asia/Karachi', now)).toBe('2026-10-11');
    expect(todayIn('UTC', now)).toBe('2026-10-10');
    expect(presetRange('today', 'Asia/Karachi', { from: '', to: '' }, now)).toEqual({ from: '2026-10-11', to: '2026-10-11' });
    expect(presetRange('yesterday', 'Asia/Karachi', { from: '', to: '' }, now)).toEqual({ from: '2026-10-10', to: '2026-10-10' });
    expect(presetRange('7d', 'Asia/Karachi', { from: '', to: '' }, now)).toEqual({ from: '2026-10-05', to: '2026-10-11' });
    expect(presetRange('30d', 'UTC', { from: '', to: '' }, now)).toEqual({ from: '2026-09-11', to: '2026-10-10' });
    expect(presetRange('custom', 'UTC', { from: '2026-01-01', to: '2026-01-31' }, now)).toEqual({ from: '2026-01-01', to: '2026-01-31' });
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('sends only relevant filters to the API (orientation is dropped for banners)', () => {
    const f: FilterState = { preset: 'custom', from: '2026-10-01', to: '2026-10-07', tz: 'Asia/Karachi', target: 'a', host: '', format: 'banner', orientation: 'portrait', placement: '', env: 'production' };
    const q = filterParams(f);
    expect(q.get('from')).toBe('2026-10-01'); expect(q.get('tz')).toBe('Asia/Karachi'); expect(q.get('target')).toBe('a');
    expect(q.has('orientation')).toBe(false); expect(q.has('host')).toBe(false);
    expect(filterParams({ ...f, format: 'interstitial' }).get('orientation')).toBe('portrait');
  });
});

describe('games table', () => {
  const rows = Array.from({ length: 23 }, (_, i) => row(`g${i}`, `Game ${String(i).padStart(2, '0')}`, m(i === 5 ? 0 : i * 10, i)));
  const renderTable = () => render(<MemoryRouter><GamesTable rows={rows} tz="UTC" linkBase="/games" nameLabel="Advertised game" /></MemoryRouter>);
  const names = () => screen.getAllByRole('link').map(l => l.textContent);

  it('sorts by impressions descending by default, paginates and searches', async () => {
    const u = userEvent.setup();
    renderTable();
    expect(names()[0]).toBe('Game 22');
    expect(names()).toHaveLength(10);
    await u.click(screen.getByRole('button', { name: 'Next page' }));
    expect(names()[0]).toBe('Game 12');
    await u.type(screen.getByRole('textbox', { name: /search advertised games/i }), 'game 07');
    expect(names()).toEqual(['Game 07']);
    await u.clear(screen.getByRole('textbox', { name: /search/i }));
    await u.type(screen.getByRole('textbox', { name: /search/i }), 'zzzz');
    expect(screen.getByText(/No advertised game.*match/i)).toBeInTheDocument();
  });
  it('puts rows without a CTR last in both directions', async () => {
    const u = userEvent.setup();
    renderTable();
    const lastRow = async () => {
      await u.click(screen.getByRole('button', { name: 'Next page' }));
      await u.click(screen.getByRole('button', { name: 'Next page' }));
      const shown = screen.getAllByRole('link').map(l => l.textContent);
      await u.click(screen.getByRole('button', { name: 'Previous page' }));
      await u.click(screen.getByRole('button', { name: 'Previous page' }));
      return shown[shown.length - 1];
    };
    await u.click(screen.getByRole('button', { name: 'CTR' }));   // descending
    expect(await lastRow()).toBe('Game 05');                       // no impressions => no CTR => always last
    await u.click(screen.getByRole('button', { name: 'CTR' }));   // ascending
    expect(await lastRow()).toBe('Game 05');
  });
});

describe('dashboard states', () => {
  it('shows the sign-in page when there is no key, and rejects a wrong key without leaving it', async () => {
    const u = userEvent.setup();
    const api = fakeApi({ check: vi.fn().mockRejectedValue(new ApiError('auth', 'no', 401)) });
    mount(api, false);
    await u.type(screen.getByLabelText('Access key'), 'wrong-key-wrong-key-1234');
    await u.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not accepted/i);
    expect(sessionStorage.getItem('ica.token')).toBeNull();
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
  });

  it('signs in with a valid key and shows totals, CTR and all games', async () => {
    const u = userEvent.setup();
    mount(fakeApi(), false);
    await u.type(screen.getByLabelText('Access key'), 'right-key-right-key-1234');
    await u.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Games with activity')).toBeInTheDocument();
    expect(screen.getAllByText('200').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2.50%').length).toBeGreaterThan(0);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Beta Game' })).toBeInTheDocument();  // zero-activity game still listed
    expect(sessionStorage.getItem('ica.token')).toBe('right-key-right-key-1234');
  });

  it('a backend failure is an error with retry, never zero activity', async () => {
    const overviewFn = vi.fn().mockRejectedValueOnce(new ApiError('network', 'Could not reach the analytics server.'))
      .mockResolvedValue(overview(m(10, 1), [row('a', 'Alpha Game', m(10, 1))]));
    const u = userEvent.setup();
    mount(fakeApi({ overview: overviewFn }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/unreachable/i);
    expect(alert).toHaveTextContent(/not zero activity/i);
    expect(screen.queryByText('Games with activity')).not.toBeInTheDocument();
    await u.click(within(alert).getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('Games with activity')).toBeInTheDocument();
  });

  it('a rejected key during a report returns the user to sign-in with a message', async () => {
    mount(fakeApi({ overview: vi.fn().mockRejectedValue(new ApiError('auth', 'x', 401)) }));
    expect(await screen.findByText(/access key was rejected/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Access key')).toBeInTheDocument();
    expect(sessionStorage.getItem('ica.token')).toBeNull();
  });

  it('zero impressions shows an empty state and an em-dash CTR, not an invented 0%', async () => {
    mount(fakeApi({ overview: vi.fn().mockResolvedValue(overview(m(0, 0), [row('a', 'Alpha Game', m(0, 0))])) }));
    expect(await screen.findByText(/No impressions or clicks for these filters/i)).toBeInTheDocument();
    await screen.findByText('Games with activity');
    expect(document.querySelector('[aria-labelledby="kpi-CTR"]')).toHaveTextContent('—');
    expect(document.querySelector('[aria-labelledby="kpi-CTR"]')).not.toHaveTextContent('0');
  });

  it('refresh re-requests data and sign out clears the key', async () => {
    const u = userEvent.setup();
    const api = fakeApi();
    mount(api);
    await screen.findByText('Games with activity');
    const before = (api.overview as ReturnType<typeof vi.fn>).mock.calls.length;
    await u.click(screen.getByRole("button", { name: "Refresh data" }));
    await waitFor(() => expect((api.overview as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(before));
    await u.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByLabelText('Access key')).toBeInTheDocument();
    expect(sessionStorage.getItem('ica.token')).toBeNull();
  });

  it('production environment is the default filter', async () => {
    const api = fakeApi();
    mount(api);
    await screen.findByText('Games with activity');
    expect((api.overview as ReturnType<typeof vi.fn>).mock.calls[0][0].env).toBe('production');
    expect((api.overview as ReturnType<typeof vi.fn>).mock.calls[0][0].tz).toBe('Asia/Karachi');
  });
});

describe('accessibility (axe-core)', () => {
  async function violations(container: HTMLElement) {
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    return r.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`);
  }
  it('login page has no violations', async () => {
    const { container } = mount(fakeApi(), false);
    expect(await violations(container)).toEqual([]);
  });
  it('overview has no violations and charts have a text alternative', async () => {
    const { container } = mount(fakeApi());
    await screen.findByText('Games with activity');
    expect(screen.getAllByText(/View chart data as a table/i).length).toBeGreaterThan(0);
    expect(await violations(container)).toEqual([]);
  });
});

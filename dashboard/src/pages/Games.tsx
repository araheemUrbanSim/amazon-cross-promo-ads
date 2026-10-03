import { useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { useApp } from '../app/AppContext';
import { useReport } from '../app/useReport';
import { FilterBar } from '../components/FilterBar';
import { Section } from '../components/Cards';
import { GamesTable } from '../components/GamesTable';
import { ErrorState, TableSkeleton } from '../components/States';
import { ExportButton } from '../components/ExportButton';
import { Freshness } from '../components/Freshness';

/** Same events, two views: games that were ADVERTISED, and games that HOSTED (displayed) the ads. */
export function Games() {
  const { api, filters } = useApp();
  const [view, setView] = useState<'advertised' | 'host'>('advertised');
  const r = useReport(() => api.overview(filters), [api, JSON.stringify(filters)]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h1" component="h1" sx={{ fontSize: '1.4rem' }}>Games</Typography>
      <FilterBar />
      <Tabs value={view} onChange={(_, v) => setView(v)} aria-label="Game view" variant="scrollable" allowScrollButtonsMobile>
        <Tab value="advertised" label="Advertised games" id="tab-adv" aria-controls="panel-games" />
        <Tab value="host" label="Host games" id="tab-host" aria-controls="panel-games" />
      </Tabs>
      {r.error && <ErrorState error={r.error} onRetry={r.reload} />}
      {r.loading && !r.data && !r.error && <TableSkeleton />}
      {r.data && (
        <Box id="panel-games" role="tabpanel" aria-labelledby={view === 'advertised' ? 'tab-adv' : 'tab-host'} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, opacity: r.loading ? 0.6 : 1 }}>
          <Freshness f={r.data.freshness} />
          {view === 'advertised' ? (
            <Section title="Advertised games" subtitle="Whose ads were shown and tapped. Click a game for its daily trend and where it was shown." action={<ExportButton view="games" label="Export CSV" />}>
              <GamesTable rows={r.data.games} tz={filters.tz} linkBase="/games" nameLabel="Advertised game" />
            </Section>
          ) : (
            <Section title="Host games" subtitle="Which games displayed ads (and how often players tapped them)." action={<ExportButton view="hosts" label="Export CSV" />}>
              <GamesTable rows={r.data.hosts} tz={filters.tz} linkBase="/hosts" nameLabel="Host game" />
            </Section>
          )}
        </Box>
      )}
    </Box>
  );
}

import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import { useReport } from '../app/useReport';
import { FilterBar } from '../components/FilterBar';
import { KpiRow, Section } from '../components/Cards';
import { DailyChart, FormatChart, TopGamesChart } from '../components/Charts';
import { GamesTable } from '../components/GamesTable';
import { ChartSkeleton, EmptyState, ErrorState, KpiSkeleton, TableSkeleton } from '../components/States';
import { Freshness } from '../components/Freshness';
import { ExportButton } from '../components/ExportButton';
import { fmtInt } from '../lib/format';

export function Overview() {
  const { api, filters } = useApp();
  const r = useReport(() => api.overview(filters), [api, JSON.stringify(filters)]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h1" component="h1" sx={{ position: 'absolute', left: -9999 }}>Overview</Typography>
      <FilterBar />
      {r.error && <ErrorState error={r.error} onRetry={r.reload} />}
      {r.loading && !r.data && !r.error && (<><KpiSkeleton /><ChartSkeleton /><Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' } }}><ChartSkeleton /><ChartSkeleton /></Box><TableSkeleton /></>)}
      {r.data && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: r.loading ? 0.6 : 1 }} aria-busy={r.loading}>
          <KpiRow totals={r.data.totals} extra={{ label: 'Games with activity', value: `${fmtInt(r.data.gamesWithActivity)} / ${fmtInt(r.data.totalGames)}`, hint: 'Advertised games with impressions or clicks' }} />
          <Freshness f={r.data.freshness} />
          {r.data.totals.impressions === 0 && r.data.totals.clicks === 0 ? (
            <Section title="No activity"><EmptyState title="No impressions or clicks for these filters">Try a wider date range or reset the filters. If you expected data, check <Button component={RouterLink} to="/diagnostics" size="small">Diagnostics</Button> for upload problems.</EmptyState></Section>
          ) : (
            <>
              <Section title="Daily performance" subtitle={`Impressions (left axis) and clicks (right axis) per day in ${filters.tz}`}>
                <DailyChart daily={r.data.daily} />
              </Section>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' } }}>
                <Section title="Top advertised games" subtitle="Ranked by impressions"><TopGamesChart rows={r.data.topGames} title="Top advertised games" /></Section>
                <Section title="Ad format breakdown"><FormatChart formats={r.data.formats} /></Section>
              </Box>
            </>
          )}
          <Section title="Games" subtitle="Advertised games: how often each game's ads were shown and tapped. All games are listed, including those with no activity."
            action={<ExportButton view="games" label="Export CSV" />}>
            <GamesTable rows={r.data.games} tz={filters.tz} linkBase="/games" nameLabel="Advertised game" />
          </Section>
        </Box>
      )}
    </Box>
  );
}

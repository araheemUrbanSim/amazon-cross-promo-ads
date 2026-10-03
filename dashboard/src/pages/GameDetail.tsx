import { Avatar, Box, Breadcrumbs, Link, Typography } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import { useReport } from '../app/useReport';
import { FilterBar } from '../components/FilterBar';
import { KpiRow, Section } from '../components/Cards';
import { BreakdownTable, DailyChart } from '../components/Charts';
import { ChartSkeleton, EmptyState, ErrorState, KpiSkeleton, TableSkeleton } from '../components/States';
import { Freshness } from '../components/Freshness';
import { fmtInt, formatLabel } from '../lib/format';

export function GameDetail({ role }: { role: 'advertised' | 'host' }) {
  const { id = '' } = useParams();
  const { api, filters } = useApp();
  const seg = role === 'advertised' ? 'games' : 'hosts';
  const r = useReport(() => api.detail(seg, id, filters), [api, seg, id, JSON.stringify(filters)]);
  const d = r.data;
  const title = d?.game.displayName ?? id;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Breadcrumbs aria-label="Breadcrumb">
        <Link component={RouterLink} to="/games" underline="hover" color="inherit">Games</Link>
        <Typography color="text.primary" aria-current="page">{title}</Typography>
      </Breadcrumbs>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar variant="rounded" src={d?.game.thumbUrl ?? undefined} alt="" slotProps={{ img: { referrerPolicy: 'no-referrer' } }} sx={{ width: 56, height: 56, bgcolor: 'primary.light', color: 'primary.dark' }}>{title.slice(0, 1).toUpperCase()}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h1" component="h1" sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' }, overflowWrap: 'anywhere' }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">{role === 'advertised' ? 'Advertised game' : 'Host game'}{d?.game.packageName ? ` · ${d.game.packageName}` : ''}</Typography>
        </Box>
      </Box>
      <FilterBar hide={[role === 'advertised' ? 'target' : 'host']} />
      {r.error && <ErrorState error={r.error} onRetry={r.reload} />}
      {r.loading && !d && !r.error && (<><KpiSkeleton /><ChartSkeleton /><TableSkeleton rows={5} /></>)}
      {d && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: r.loading ? 0.6 : 1 }}>
          {!d.inInventory && <Typography role="status" color="warning.main" variant="body2">This id is not in the 34-game inventory; showing whatever events were recorded for it.</Typography>}
          <KpiRow totals={d.totals} extra={{ label: d.otherGameLabel + 's', value: fmtInt(d.byOtherGame.length), hint: role === 'advertised' ? 'Host games that showed this ad' : 'Advertised games shown in this game' }} />
          <Freshness f={d.freshness} />
          {d.totals.impressions === 0 && d.totals.clicks === 0 ? (
            <Section title="No activity"><EmptyState title="No impressions or clicks for these filters">This game has no recorded activity in the selected period.</EmptyState></Section>
          ) : (
            <>
              <Section title="Daily trend" subtitle={`Per day in ${filters.tz}`}><DailyChart daily={d.daily} /></Section>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
                <Section title={`By ${d.otherGameLabel.toLowerCase()}`}>
                  <BreakdownTable firstHeader={d.otherGameLabel} rows={[...d.byOtherGame].sort((a, b) => b.metrics.impressions - a.metrics.impressions).map(x => ({ key: x.id, name: x.name, metrics: x.metrics }))} />
                </Section>
                <Section title="By ad format"><BreakdownTable firstHeader="Format" rows={d.byFormat.map(x => ({ ...x, name: formatLabel(x.key) }))} /></Section>
                <Section title="By placement"><BreakdownTable firstHeader="Placement" rows={d.byPlacement} /></Section>
                <Section title="By creative"><BreakdownTable firstHeader="Creative" rows={d.byCreative} /></Section>
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

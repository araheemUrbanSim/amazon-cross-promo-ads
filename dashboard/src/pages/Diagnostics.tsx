import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useApp } from '../app/AppContext';
import { useReport } from '../app/useReport';
import { Kpi, Section } from '../components/Cards';
import { ErrorState, KpiSkeleton, TableSkeleton } from '../components/States';
import { Freshness } from '../components/Freshness';
import { fmtDuration, fmtInt } from '../lib/format';
import { formatDateTime } from '../lib/time';

export function Diagnostics() {
  const { api, filters } = useApp();
  const r = useReport(() => api.diagnostics(), [api]);
  const d = r.data;
  const tz = filters.tz;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h1" component="h1" sx={{ fontSize: '1.4rem' }}>Diagnostics</Typography>
      <Typography variant="body2" color="text.secondary">Ingestion health for the last 30 days. Use this to tell "nobody saw ads" apart from "events are not arriving".</Typography>
      {r.error && <ErrorState error={r.error} onRetry={r.reload} />}
      {r.loading && !d && !r.error && (<><KpiSkeleton /><TableSkeleton /></>)}
      {d && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Freshness f={d.freshness} />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
            <Kpi label="Events accepted" value={fmtInt(d.last30Days.accepted)} hint="New events stored" />
            <Kpi label="Duplicates ignored" value={fmtInt(d.last30Days.duplicatesIgnored)} hint="Retries counted once" />
            <Kpi label="Events rejected" value={fmtInt(d.last30Days.rejected)} hint="Invalid, kept out of totals" />
            <Kpi label="Avg upload delay" value={fmtDuration(d.last30Days.averageUploadDelaySeconds)} hint={`Max ${fmtDuration(d.last30Days.maxUploadDelaySeconds)}`} />
          </Box>
          <Section title="Rejected events by reason" subtitle="Rejected events never reach impression or click totals.">
            {d.rejectedReasons.length === 0 ? <Typography variant="body2" color="text.secondary">None recorded.</Typography> : (
              <Table size="small" aria-label="Rejected events by reason"><TableHead><TableRow><TableCell>Reason</TableCell><TableCell align="right">Count</TableCell><TableCell>Last seen</TableCell></TableRow></TableHead>
                <TableBody>{d.rejectedReasons.map(x => <TableRow key={x.reason}><TableCell>{x.reason}</TableCell><TableCell align="right">{fmtInt(x.count)}</TableCell><TableCell>{formatDateTime(x.lastUtc, tz)}</TableCell></TableRow>)}</TableBody></Table>
            )}
          </Section>
          <Section title="Upload problems" subtitle="Whole requests that failed before any event was read (bad JSON, wrong type, rate limit, size).">
            {d.recentIngestErrors.length === 0 ? <Typography variant="body2" color="text.secondary">None recorded.</Typography> : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" aria-label="Recent upload problems"><TableHead><TableRow><TableCell>When</TableCell><TableCell>Kind</TableCell><TableCell align="right">HTTP</TableCell><TableCell>Detail</TableCell></TableRow></TableHead>
                  <TableBody>{d.recentIngestErrors.slice(0, 20).map((x, i) => <TableRow key={i}><TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(x.received_utc, tz)}</TableCell><TableCell>{x.kind}</TableCell><TableCell align="right">{x.status}</TableCell><TableCell>{x.detail ?? '—'}</TableCell></TableRow>)}</TableBody></Table>
              </Box>
            )}
          </Section>
          <Section title="Uploads per day" subtitle="By the day the server received them (not when they happened).">
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" aria-label="Uploads per day"><TableHead><TableRow><TableCell>Received date (UTC)</TableCell><TableCell align="right">Accepted</TableCell><TableCell align="right">Duplicates</TableCell><TableCell align="right">Rejected</TableCell><TableCell align="right">Clock-skewed</TableCell></TableRow></TableHead>
                <TableBody>{d.perDay.map(x => <TableRow key={x.receivedDate}><TableCell>{x.receivedDate}</TableCell><TableCell align="right">{fmtInt(x.accepted)}</TableCell><TableCell align="right">{fmtInt(x.duplicates)}</TableCell><TableCell align="right">{fmtInt(x.rejected)}</TableCell><TableCell align="right">{fmtInt(x.skewed)}</TableCell></TableRow>)}</TableBody></Table>
            </Box>
          </Section>
          <Section title="SDK versions seen" subtitle="Raw events still within retention.">
            {d.sdkVersionsInRawEvents.map(v => <Typography key={v.version} variant="body2">{v.version}: {fmtInt(v.events)} events</Typography>)}
            {d.sdkVersionsInRawEvents.length === 0 && <Typography variant="body2" color="text.secondary">No events yet.</Typography>}
          </Section>
        </Box>
      )}
    </Box>
  );
}

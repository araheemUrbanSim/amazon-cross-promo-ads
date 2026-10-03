import { ReactNode } from 'react';
import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { Breakdown, Daily, Row } from '../api/types';
import { fmtCtr, fmtInt, formatLabel } from '../lib/format';
import { formatDay } from '../lib/time';
import { EmptyState } from './States';

export const BLUE = '#1967d2';
export const GREEN = '#188038';
const PALETTE = ['#1967d2', '#188038', '#e37400', '#9334e6', '#5f6368'];

/** Screen-reader / keyboard alternative to a chart: the same numbers as a real table. */
export function ChartTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <Box component="details" sx={{ mt: 1, '& summary': { cursor: 'pointer', color: 'primary.main', fontSize: '0.85rem', py: 0.5, borderRadius: 1 }, '& summary:focus-visible': { outline: '3px solid #1967d2', outlineOffset: 2 } }}>
      <summary>View chart data as a table</summary>
      <Box sx={{ maxHeight: 280, overflow: 'auto', mt: 1 }}>
        <Table size="small" aria-label={caption}>
          <caption style={{ position: 'absolute', left: -9999 }}>{caption}</caption>
          <TableHead><TableRow>{head.map(h => <TableCell key={h} scope="col" align={h === head[0] ? 'left' : 'right'}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>{rows.map((r, i) => (
            <TableRow key={i}>{r.map((c, j) => j === 0 ? <TableCell key={j} component="th" scope="row">{c}</TableCell> : <TableCell key={j} align="right">{typeof c === 'number' ? fmtInt(c) : c}</TableCell>)}</TableRow>
          ))}</TableBody>
        </Table>
      </Box>
    </Box>
  );
}

function ChartFrame({ label, children }: { label: string; children: ReactNode }) {
  return <Box role="group" aria-label={label}>{children}</Box>;
}

export function DailyChart({ daily }: { daily: Daily[] }) {
  const label = `Daily impressions and clicks, ${daily.length} days`;
  const labels = daily.map(d => formatDay(d.date));
  return (
    <ChartFrame label={label}>
      <Box role="img" aria-label={`${label}. A data table follows.`}>
        <LineChart height={300} hideLegend={false}
          xAxis={[{ id: 'day', scaleType: 'point', data: labels }]}
          yAxis={[{ id: 'imp', min: 0, position: 'left', width: 56 }, { id: 'clk', min: 0, position: 'right', width: 48 }]}
          series={[
            { id: 'i', label: 'Impressions', data: daily.map(d => d.metrics.impressions), yAxisId: 'imp', color: BLUE, showMark: daily.length <= 31, curve: 'monotoneX' },
            { id: 'c', label: 'Clicks', data: daily.map(d => d.metrics.clicks), yAxisId: 'clk', color: GREEN, showMark: daily.length <= 31, curve: 'monotoneX' }
          ]}
          margin={{ left: 8, right: 8, top: 16, bottom: 8 }} />
      </Box>
      <ChartTable caption={label} head={['Date', 'Impressions', 'Clicks', 'CTR']}
        rows={daily.map(d => [d.date, d.metrics.impressions, d.metrics.clicks, fmtCtr(d.metrics.ctr)])} />
    </ChartFrame>
  );
}

const short = (s: string, n = 26) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export function TopGamesChart({ rows, title }: { rows: Row[]; title: string }) {
  if (rows.length === 0) return <EmptyState title="No activity in this period">Games appear here once they record impressions.</EmptyState>;
  const label = `${title}, top ${rows.length} by impressions`;
  return (
    <ChartFrame label={label}>
      <Box role="img" aria-label={`${label}. A data table follows.`}>
        <BarChart height={Math.max(220, rows.length * 34 + 60)} layout="horizontal"
          yAxis={[{ id: 'g', scaleType: 'band', data: rows.map(r => short(r.name)), width: 170 }]}
          xAxis={[{ id: 'v', min: 0 }]}
          series={[{ id: 'imp', label: 'Impressions', data: rows.map(r => r.metrics.impressions), color: BLUE }, { id: 'clk', label: 'Clicks', data: rows.map(r => r.metrics.clicks), color: GREEN }]}
          margin={{ left: 8, right: 16, top: 8, bottom: 8 }} />
      </Box>
      <ChartTable caption={label} head={['Game', 'Impressions', 'Clicks', 'CTR']} rows={rows.map(r => [r.name, r.metrics.impressions, r.metrics.clicks, fmtCtr(r.metrics.ctr)])} />
    </ChartFrame>
  );
}

export function FormatChart({ formats }: { formats: Breakdown[] }) {
  const active = formats.filter(f => f.metrics.impressions > 0);
  if (active.length === 0) return <EmptyState title="No activity in this period" />;
  const label = 'Impressions by ad format';
  return (
    <ChartFrame label={label}>
      <Box role="img" aria-label={`${label}: ${active.map(f => `${formatLabel(f.key)} ${fmtInt(f.metrics.impressions)}`).join(', ')}.`}>
        <PieChart height={240}
          series={[{ id: 'f', innerRadius: 56, outerRadius: 100, paddingAngle: 2, cornerRadius: 4, data: active.map((f, i) => ({ id: f.key, label: formatLabel(f.key), value: f.metrics.impressions, color: PALETTE[i % PALETTE.length] })) }]}
          margin={{ top: 8, bottom: 8, left: 8, right: 8 }} />
      </Box>
      <ChartTable caption={label} head={['Format', 'Impressions', 'Clicks', 'CTR']} rows={formats.map(f => [formatLabel(f.key), f.metrics.impressions, f.metrics.clicks, fmtCtr(f.metrics.ctr)])} />
    </ChartFrame>
  );
}

/** Small ranked bar list used by game-detail breakdowns. */
export function BreakdownTable({ rows, firstHeader, empty = 'No activity' }: { rows: { key: string; name?: string; metrics: Breakdown['metrics'] }[]; firstHeader: string; empty?: string }) {
  if (rows.length === 0) return <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>{empty}</Typography>;
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" aria-label={`Breakdown by ${firstHeader.toLowerCase()}`}>
        <TableHead><TableRow><TableCell>{firstHeader}</TableCell><TableCell align="right">Impressions</TableCell><TableCell align="right">Clicks</TableCell><TableCell align="right">CTR</TableCell></TableRow></TableHead>
        <TableBody>
          {rows.map(r => (
            <TableRow key={r.key} hover>
              <TableCell sx={{ maxWidth: 260, overflowWrap: 'anywhere' }}>{r.name ?? r.key}</TableCell>
              <TableCell align="right">{fmtInt(r.metrics.impressions)}</TableCell>
              <TableCell align="right">{fmtInt(r.metrics.clicks)}</TableCell>
              <TableCell align="right">{fmtCtr(r.metrics.ctr)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

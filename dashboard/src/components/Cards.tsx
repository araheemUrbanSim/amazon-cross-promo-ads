import { ReactNode } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { Metrics } from '../api/types';
import { fmtCtr, fmtInt } from '../lib/format';

export function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary" id={`kpi-${label.replace(/\W+/g, '-')}`}>{label}</Typography>
        <Typography variant="h1" component="p" aria-labelledby={`kpi-${label.replace(/\W+/g, '-')}`} sx={{ fontSize: { xs: '1.6rem', md: '2rem' }, mt: 0.5 }}>{value}</Typography>
        {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
      </CardContent>
    </Card>
  );
}

export function KpiRow({ totals, extra }: { totals: Metrics; extra: { label: string; value: string; hint?: string } }) {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
      <Kpi label="Impressions" value={fmtInt(totals.impressions)} hint="Qualified ad views" />
      <Kpi label="Clicks" value={fmtInt(totals.clicks)} hint="Taps on an ad (not installs)" />
      <Kpi label="CTR" value={fmtCtr(totals.ctr)} hint="Clicks ÷ impressions" />
      <Kpi label={extra.label} value={extra.value} hint={extra.hint} />
    </Box>
  );
}

/** Section card with an optional accessible data-table alternative for the chart it contains. */
export function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card component="section" aria-label={title}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h2" component="h2" sx={{ fontSize: '1.05rem' }}>{title}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          </Box>
          {action}
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

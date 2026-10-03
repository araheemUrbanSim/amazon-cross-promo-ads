import { Box, Card, CardActions, CardContent, Typography } from '@mui/material';
import { FilterBar } from '../components/FilterBar';
import { ExportButton } from '../components/ExportButton';

const REPORTS = [
  { view: 'games', title: 'Advertised games', text: 'One row per game in the 34-game inventory: impressions, clicks, CTR, store-launch requests, last activity. Includes games with zero activity.' },
  { view: 'hosts', title: 'Host games', text: 'The same metrics grouped by the game that displayed the ads.' },
  { view: 'daily', title: 'Daily performance', text: 'One row per day in the selected time zone, zero-filled.' },
  { view: 'formats', title: 'Ad formats', text: 'Banner, MREC and interstitial totals.' },
  { view: 'placements', title: 'Placements', text: 'Totals per placement id.' },
  { view: 'creatives', title: 'Creatives', text: 'Totals per creative id.' }
];

export function Reports() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h1" component="h1" sx={{ fontSize: '1.4rem' }}>Reports</Typography>
      <Typography variant="body2" color="text.secondary">
        CSV exports use the filters below. Each file states the range, time zone and environment. Clicks are tap actions, not installs or downloads;
        CTR is clicks ÷ impressions × 100 from the totals, and blank when there were no impressions.
      </Typography>
      <FilterBar />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: 'repeat(3, 1fr)' } }}>
        {REPORTS.map(r => (
          <Card key={r.view} component="section" aria-label={r.title} sx={{ display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h2" component="h2" sx={{ fontSize: '1.05rem' }}>{r.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{r.text}</Typography>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}><ExportButton view={r.view} label="Download CSV" /></CardActions>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

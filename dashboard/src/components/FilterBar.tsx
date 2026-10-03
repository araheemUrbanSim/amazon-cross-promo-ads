import { Autocomplete, Box, Button, Card, CardContent, Collapse, MenuItem, TextField, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useMemo, useState } from 'react';
import { useApp } from '../app/AppContext';
import { FilterState } from '../api/types';
import { allTimeZones, presetRange, tzLabel } from '../lib/time';
import { formatLabel } from '../lib/format';

const PRESETS: { value: FilterState['preset']; label: string }[] = [
  { value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' }, { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' }, { value: 'custom', label: 'Custom' }
];

interface Props {
  /** Hide the advertised-game or host-game filter on pages where that dimension is fixed. */
  hide?: ('target' | 'host')[];
}

export function FilterBar({ hide = [] }: Props) {
  const { filters: f, setFilters, resetFilters, meta } = useApp();
  const zones = useMemo(allTimeZones, []);
  const desktop = useMediaQuery(useTheme().breakpoints.up('md'));
  const [openMobile, setOpenMobile] = useState(false);
  const expanded = desktop || openMobile;
  const active = [f.tz !== 'Asia/Karachi', f.target, f.host, f.format, f.orientation, f.placement, f.env !== 'production'].filter(Boolean).length;
  const range = presetRange(f.preset, f.tz, { from: f.from, to: f.to });
  const games = meta?.games ?? [];
  const orientationOn = f.format === '' || f.format === 'interstitial';

  const select = (label: string, value: string, onChange: (v: string) => void, options: { value: string; label: string }[], disabled = false) => (
    <TextField select size="small" label={label} value={value} disabled={disabled} onChange={e => onChange(e.target.value)} sx={{ minWidth: 150, flex: '1 1 150px' }}>
      {options.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
    </TextField>
  );

  return (
    <Card component="section" aria-label="Filters" sx={{ mb: 2 }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <ToggleButtonGroup exclusive size="small" color="primary" value={f.preset} aria-label="Date range"
            onChange={(_, v) => { if (v) setFilters({ preset: v, ...(v === 'custom' && !f.from ? { from: range.from, to: range.to } : {}) }); }}>
            {PRESETS.map(p => <ToggleButton key={p.value} value={p.value} sx={{ px: 1.5, textTransform: 'none' }}>{p.label}</ToggleButton>)}
          </ToggleButtonGroup>
          {f.preset === 'custom' && (
            <>
              <TextField size="small" type="date" label="From" value={f.from} onChange={e => setFilters({ from: e.target.value, to: f.to < e.target.value ? e.target.value : f.to })} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField size="small" type="date" label="To" value={f.to} onChange={e => setFilters({ to: e.target.value, from: f.from > e.target.value ? e.target.value : f.from })} slotProps={{ inputLabel: { shrink: true } }} />
            </>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ ml: { md: 'auto' } }} data-testid="range-summary">
            {range.from === range.to ? range.from : `${range.from} → ${range.to}`}
          </Typography>
        </Box>

        {!desktop && (
          <Button size="small" variant="text" aria-expanded={expanded} aria-controls="more-filters" onClick={() => setOpenMobile(o => !o)} sx={{ alignSelf: 'flex-start' }}>
            {expanded ? 'Hide filters' : `More filters${active ? ` (${active} active)` : ''}`}
          </Button>
        )}
        <Collapse in={expanded} id="more-filters">
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
          <Autocomplete size="small" disableClearable options={zones} value={f.tz} getOptionLabel={tz => tzLabel(tz)}
            onChange={(_, v) => setFilters({ tz: v })} sx={{ minWidth: 260, flex: '1 1 260px' }}
            renderInput={p => <TextField {...p} label="Time zone" />} />
          {!hide.includes('target') && (
            <Autocomplete size="small" options={games.map(g => g.gameId)} value={f.target || null} sx={{ minWidth: 220, flex: '1 1 220px' }}
              getOptionLabel={id => games.find(g => g.gameId === id)?.displayName ?? id}
              onChange={(_, v) => setFilters({ target: v ?? '' })}
              renderInput={p => <TextField {...p} label="Advertised game" placeholder="All games" />} />
          )}
          {!hide.includes('host') && (
            <Autocomplete size="small" options={games.map(g => g.packageName)} value={f.host || null} sx={{ minWidth: 220, flex: '1 1 220px' }}
              getOptionLabel={pkg => games.find(g => g.packageName === pkg)?.displayName ?? pkg}
              onChange={(_, v) => setFilters({ host: v ?? '' })}
              renderInput={p => <TextField {...p} label="Host game" placeholder="All games" />} />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {select('Ad format', f.format, v => setFilters({ format: v, ...(v === 'banner' || v === 'mrec' ? { orientation: '' } : {}) }),
            [{ value: '', label: 'All formats' }, ...(meta?.formats ?? ['banner', 'mrec', 'interstitial']).map(v => ({ value: v, label: formatLabel(v) }))])}
          {select('Interstitial orientation', orientationOn ? f.orientation : '', v => setFilters({ orientation: v }),
            [{ value: '', label: 'Any' }, { value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }], !orientationOn)}
          {select('Placement', f.placement, v => setFilters({ placement: v }),
            [{ value: '', label: 'All placements' }, ...(meta?.placements ?? []).map(v => ({ value: v, label: v }))])}
          {select('Environment', f.env, v => setFilters({ env: v as FilterState['env'] }),
            [{ value: 'production', label: 'Production' }, { value: 'test', label: 'Test' }, { value: 'all', label: 'Production + test' }])}
          <Button size="small" onClick={resetFilters}>Reset filters</Button>
        </Box>
        </Collapse>
        {f.env !== 'production' && (
          <Typography variant="caption" color="warning.main" role="status">
            {f.env === 'test' ? 'Showing TEST events only (internal testing, not real players).' : 'Test events are included in these totals.'}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

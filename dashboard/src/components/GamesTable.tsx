import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Avatar, Box, InputAdornment, Link, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Row } from '../api/types';
import { fmtCtr, fmtInt } from '../lib/format';
import { formatDateTime } from '../lib/time';
import { EmptyState } from './States';

type SortKey = 'name' | 'impressions' | 'clicks' | 'ctr' | 'last';

/** Compare with nulls always last, whichever direction is chosen. */
function compare(a: Row, b: Row, key: SortKey, dir: 'asc' | 'desc'): number {
  const val = (r: Row): number | string | null => {
    switch (key) {
      case 'name': return r.name.toLowerCase();
      case 'impressions': return r.metrics.impressions;
      case 'clicks': return r.metrics.clicks;
      case 'ctr': return r.metrics.ctr;
      default: return r.metrics.lastActivityUtc;
    }
  };
  const x = val(a), y = val(b);
  if (x === null && y === null) return a.name.localeCompare(b.name);
  if (x === null) return 1;
  if (y === null) return -1;
  const c = x < y ? -1 : x > y ? 1 : 0;
  return (dir === 'asc' ? c : -c) || a.name.localeCompare(b.name);
}

export function GamesTable({ rows, tz, linkBase, nameLabel }: { rows: Row[]; tz: string; linkBase: '/games' | '/hosts'; nameLabel: string }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'impressions', dir: 'desc' });
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const r = t ? rows.filter(x => x.name.toLowerCase().includes(t) || (x.packageName ?? '').toLowerCase().includes(t) || x.id.toLowerCase().includes(t)) : rows;
    return [...r].sort((a, b) => compare(a, b, sort.key, sort.dir));
  }, [rows, q, sort]);

  const pageRows = filtered.slice(page * perPage, page * perPage + perPage);
  const lastPage = Math.max(0, Math.ceil(filtered.length / perPage) - 1);
  if (page > lastPage) setPage(lastPage);

  const head = (key: SortKey, label: string, numeric = true) => (
    <TableCell align={numeric ? 'right' : 'left'} sortDirection={sort.key === key ? sort.dir : false} scope="col">
      <TableSortLabel active={sort.key === key} direction={sort.key === key ? sort.dir : 'asc'}
        onClick={() => setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : s.key === key ? 'desc' : key === 'name' ? 'asc' : 'desc' }))}>
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <Box>
      <TextField size="small" fullWidth value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder={`Search ${nameLabel.toLowerCase()}s`}
        slotProps={{ htmlInput: { 'aria-label': `Search ${nameLabel.toLowerCase()}s by name or package` }, input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        sx={{ mb: 1.5, maxWidth: 420 }} />
      {filtered.length === 0 ? <EmptyState title={`No ${nameLabel.toLowerCase()}s match "${q}"`} /> : (
        <TableContainer>
          <Table size="medium" aria-label={`${nameLabel} performance`} sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                {head('name', nameLabel, false)}
                {head('impressions', 'Impressions')}
                {head('clicks', 'Clicks')}
                {head('ctr', 'CTR')}
                {head('last', 'Last activity', false)}
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell component="th" scope="row">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      <Avatar variant="rounded" src={r.thumbUrl ?? undefined} alt="" slotProps={{ img: { referrerPolicy: 'no-referrer', loading: 'lazy' } }} sx={{ width: 36, height: 36, bgcolor: 'primary.light', color: 'primary.dark', fontSize: 14 }}>
                        {r.name.slice(0, 1).toUpperCase()}
                      </Avatar>
                      <Link component={RouterLink} to={`${linkBase}/${encodeURIComponent(r.id)}`} underline="hover" sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{r.name}</Link>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{fmtInt(r.metrics.impressions)}</TableCell>
                  <TableCell align="right">{fmtInt(r.metrics.clicks)}</TableCell>
                  <TableCell align="right">{fmtCtr(r.metrics.ctr)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.metrics.lastActivityUtc ? formatDateTime(r.metrics.lastActivityUtc, tz) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <TablePagination component="div" count={filtered.length} page={Math.min(page, lastPage)} rowsPerPage={perPage}
        rowsPerPageOptions={[10, 25, 50]} onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={e => { setPerPage(Number(e.target.value)); setPage(0); }}
        slotProps={{ actions: { previousButton: { 'aria-label': 'Previous page' }, nextButton: { 'aria-label': 'Next page' } } }} />
    </Box>
  );
}

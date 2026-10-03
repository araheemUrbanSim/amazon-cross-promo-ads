import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar, Box, Button, Chip, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Tooltip, Typography, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import GamesIcon from '@mui/icons-material/SportsEsportsOutlined';
import ReportIcon from '@mui/icons-material/AssessmentOutlined';
import HealthIcon from '@mui/icons-material/MonitorHeartOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { useApp } from '../app/AppContext';
import { formatDateTime } from '../lib/time';
import { ErrorState } from './States';

const WIDTH = 232;
const NAV = [
  { to: '/', label: 'Overview', icon: <DashboardIcon />, end: true },
  { to: '/games', label: 'Games', icon: <GamesIcon /> },
  { to: '/reports', label: 'Reports', icon: <ReportIcon /> },
  { to: '/diagnostics', label: 'Diagnostics', icon: <HealthIcon /> }
];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <Box component="nav" aria-label="Main">
      <Toolbar sx={{ gap: 1.25 }}>
        <Box aria-hidden sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: 'primary.main', display: 'grid', placeItems: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 32 32"><path d="M8 22V13m6 9V9m6 13v-7m4 7" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" /></svg>
        </Box>
        <Typography variant="h3" component="span">Iconic Ads</Typography>
      </Toolbar>
      <List component="ul" disablePadding sx={{ px: 1.5 }}>
        {NAV.map(n => {
          const selected = n.end ? pathname === '/' : pathname.startsWith(n.to) || (n.to === '/games' && pathname.startsWith('/hosts'));
          return (
            <ListItem key={n.to} component="li" disablePadding>
            <ListItemButton component={NavLink} to={n.to} end={n.end} selected={selected} onClick={onNavigate}
              aria-current={selected ? 'page' : undefined}
              sx={{ borderRadius: 6, mb: 0.5, '&.Mui-selected': { bgcolor: 'primary.light', color: 'primary.dark', '& .MuiListItemIcon-root': { color: 'primary.dark' } } }}>
              <ListItemIcon sx={{ minWidth: 40 }}>{n.icon}</ListItemIcon>
              <ListItemText primary={n.label} slotProps={{ primary: { sx: { fontWeight: selected ? 600 : 400 } } }} />
            </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

export function Layout() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const { lastUpdated, refresh, logout, filters, config, role, metaError, reloadMeta } = useApp();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box component="a" href="#main" sx={{ position: 'absolute', left: -9999, '&:focus': { left: 8, top: 8, zIndex: 2000, bgcolor: 'background.paper', p: 1.5, borderRadius: 1 } }}>Skip to content</Box>
      {desktop ? (
        <Drawer variant="permanent" sx={{ width: WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: WIDTH, boxSizing: 'border-box', bgcolor: 'background.default', borderRight: 0 } }}>
          <Nav />
        </Drawer>
      ) : (
        <Drawer open={open} onClose={() => setOpen(false)} ModalProps={{ keepMounted: false }} sx={{ '& .MuiDrawer-paper': { width: WIDTH, bgcolor: 'background.default' } }}>
          <Nav onNavigate={() => setOpen(false)} />
        </Drawer>
      )}
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar sx={{ gap: 1, flexWrap: 'wrap', py: { xs: 0.5, md: 0 } }}>
            {!desktop && <IconButton edge="start" aria-label="Open navigation menu" onClick={() => setOpen(true)}><MenuIcon /></IconButton>}
            <Typography variant="h1" component="p" sx={{ fontSize: { xs: '1.1rem', md: '1.4rem' }, flexGrow: 1 }}>Iconic Ads Analytics</Typography>
            {config.environmentLabel && <Chip size="small" label={config.environmentLabel} color="warning" variant="outlined" />}
            <Typography variant="body2" color="text.secondary" aria-live="polite" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Last updated: {lastUpdated ? formatDateTime(lastUpdated.toISOString(), filters.tz) : '—'}
            </Typography>
            <Tooltip title="Refresh all data"><Button variant="outlined" size="small" aria-label="Refresh data" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button></Tooltip>
            <Tooltip title={`Signed in${role ? ` (${role})` : ''}`}><IconButton aria-label="Sign out" onClick={() => logout()}><LogoutIcon /></IconButton></Tooltip>
          </Toolbar>
          <Divider sx={{ display: { xs: 'block', sm: 'none' } }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' }, px: 2, pb: 0.5 }}>
            Last updated: {lastUpdated ? formatDateTime(lastUpdated.toISOString(), filters.tz) : '—'}
          </Typography>
        </AppBar>
        <Box component="main" id="main" tabIndex={-1} sx={{ p: { xs: 2, md: 3 }, maxWidth: 1440, width: '100%', mx: 'auto', outline: 'none' }}>
          {metaError && <Box sx={{ mb: 2 }}><ErrorState error={metaError} onRetry={reloadMeta} /></Box>}
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

import { ReactNode } from 'react';
import { Alert, AlertTitle, Box, Button, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { ApiError } from '../api/client';
import { useApp } from '../app/AppContext';

/** Backend failures are shown as failures. They are never rendered as zero activity. */
export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const { config } = useApp();
  const titles: Record<ApiError['kind'], string> = {
    network: 'Analytics server unreachable',
    server: 'Analytics server error',
    auth: 'Access key rejected',
    bad_request: 'The request was not valid',
    rate_limited: 'Too many requests',
    not_configured: 'Analytics server not configured'
  };
  return (
    <Alert severity={error.kind === 'bad_request' ? 'warning' : 'error'} role="alert"
      action={onRetry && error.kind !== 'not_configured' ? <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={onRetry}>Retry</Button> : undefined}>
      <AlertTitle>{titles[error.kind]}</AlertTitle>
      {error.message}
      {error.kind === 'network' && <> No data is shown because the server could not be reached; this is not zero activity. ({config.apiBaseUrl || 'no URL set'})</>}
    </Alert>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Box sx={{ py: 6, px: 2, textAlign: 'center', color: 'text.secondary', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <SearchOffIcon fontSize="large" aria-hidden />
      <Typography variant="h3" color="text.primary">{title}</Typography>
      {children && <Typography variant="body2">{children}</Typography>}
    </Box>
  );
}

export function KpiSkeleton() {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }} aria-busy="true" aria-label="Loading key figures">
      {[0, 1, 2, 3].map(i => (
        <Card key={i}><CardContent><Skeleton width="50%" /><Skeleton variant="text" height={48} width="70%" /></CardContent></Card>
      ))}
    </Box>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return <Skeleton variant="rounded" height={height} aria-label="Loading chart" />;
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Stack spacing={1} aria-busy="true" aria-label="Loading table">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} variant="rounded" height={40} />)}
    </Stack>
  );
}

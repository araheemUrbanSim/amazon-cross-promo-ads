import { FormEvent, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from '@mui/material';
import { useApp } from '../app/AppContext';
import { ApiError } from '../api/client';

export function Login() {
  const { login, authMessage, config } = useApp();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notConfigured = !config.apiBaseUrl;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token.trim()) { setError('Enter your access key.'); return; }
    setBusy(true); setError(null);
    try { await login(token); }
    catch (err) {
      const k = err instanceof ApiError ? err.kind : 'server';
      setError(k === 'auth' ? 'That access key was not accepted.'
        : k === 'network' ? `Could not reach the analytics server at ${config.apiBaseUrl}. Check your connection or ask an administrator whether the server is running. Your key was not checked.`
        : k === 'rate_limited' ? 'Too many attempts. Wait a minute and try again.'
        : err instanceof Error ? err.message : 'Sign-in failed.');
    } finally { setBusy(false); }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'background.default' }}>
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: { xs: 3, sm: 4 } }}>
          <Box>
            <Typography variant="h1" component="h1">Iconic Ads Analytics</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Cross-promotion impressions and clicks across all games.</Typography>
          </Box>
          {notConfigured && <Alert severity="error">The analytics server URL is not set. Edit <code>config.json</code> next to this page (see the setup guide).</Alert>}
          {authMessage && <Alert severity="info" role="status">{authMessage}</Alert>}
          {error && <Alert severity="error" role="alert">{error}</Alert>}
          <TextField label="Access key" type="password" autoComplete="current-password" value={token} onChange={e => setToken(e.target.value)} disabled={busy || notConfigured}
            helperText="Issued by your administrator. It is kept only for this browser tab." autoFocus fullWidth />
          <Button type="submit" variant="contained" size="large" disabled={busy || notConfigured} startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}>
            {busy ? 'Checking…' : 'Sign in'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

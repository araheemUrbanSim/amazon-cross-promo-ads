import { useState } from 'react';
import { Alert, Button, CircularProgress, Snackbar } from '@mui/material';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import { useApp } from '../app/AppContext';
import { ApiError } from '../api/client';
import { saveBlob } from '../lib/csv';

/** Downloads a CSV from the authenticated API (the key is sent as a header, never in the URL). */
export function ExportButton({ view, label }: { view: string; label: string }) {
  const { api, filters, logout } = useApp();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setBusy(true);
    try {
      const { blob, filename } = await api.exportCsv(view, filters);
      saveBlob(blob, filename);
      setMsg({ ok: true, text: `Downloaded ${filename}` });
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('server', 'Export failed.');
      if (err.kind === 'auth') { logout('Your access key was rejected. Sign in again.'); return; }
      setMsg({ ok: false, text: `Export failed: ${err.message}` });
    } finally { setBusy(false); }
  }

  return (
    <>
      <Button size="small" variant="outlined" startIcon={busy ? <CircularProgress size={16} /> : <DownloadIcon />} onClick={run} disabled={busy}>{label}</Button>
      <Snackbar open={msg !== null} autoHideDuration={6000} onClose={() => setMsg(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={msg?.ok ? 'success' : 'error'} onClose={() => setMsg(null)} role={msg?.ok ? 'status' : 'alert'}>{msg?.text}</Alert>
      </Snackbar>
    </>
  );
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { App } from './App';
import { AppProvider } from './app/AppContext';
import { loadConfig } from './lib/config';
import { theme } from './theme';

loadConfig().then(config => {
  document.title = 'Iconic Ads Analytics';
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppProvider config={config}><App /></AppProvider>
      </ThemeProvider>
    </StrictMode>
  );
});

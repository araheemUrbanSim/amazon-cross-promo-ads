import { createTheme } from '@mui/material/styles';

// AdMob-inspired: light gray canvas, white rounded cards, one restrained blue.
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1967d2', dark: '#174ea6', light: '#e8f0fe' },
    secondary: { main: '#188038' },
    error: { main: '#c5221f' },
    warning: { main: '#8a4b00' },
    background: { default: '#f1f3f4', paper: '#ffffff' },
    text: { primary: '#202124', secondary: '#5f6368' },
    divider: '#dadce0'
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Google Sans", Roboto, "Segoe UI", Arial, sans-serif',
    h1: { fontSize: '1.5rem', fontWeight: 500 },
    h2: { fontSize: '1.25rem', fontWeight: 500 },
    h3: { fontSize: '1rem', fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 500 }
  },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { backgroundColor: '#f1f3f4' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiCard: { defaultProps: { variant: 'outlined' }, styleOverrides: { root: { borderRadius: 12, borderColor: '#dadce0' } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 20 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 600, color: '#3c4043' } } },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: '#fff' } } },
    // Always-visible keyboard focus on interactive controls.
    MuiButtonBase: { styleOverrides: { root: { '&.Mui-focusVisible': { outline: '3px solid #1a73e8', outlineOffset: 2 } } } }
  }
});

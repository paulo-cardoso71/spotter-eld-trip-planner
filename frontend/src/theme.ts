import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#1a237e', light: '#534bae', dark: '#000051' },
    secondary: { main: '#ff6d00', light: '#ff9e40', dark: '#c43e00' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"DM Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontFamily: '"Plus Jakarta Sans", "DM Sans", sans-serif', fontWeight: 700 },
    h5: { fontFamily: '"Plus Jakarta Sans", "DM Sans", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Plus Jakarta Sans", "DM Sans", sans-serif', fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCard: { defaultProps: { elevation: 2 } },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
  },
});

export default theme;

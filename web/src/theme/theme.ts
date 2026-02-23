import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { lightPalette, darkPalette } from './palette';

const sharedOptions: ThemeOptions = {
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: [
      '"Inter"',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 44,
          borderRadius: 10,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
      },
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            minHeight: 44,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...sharedOptions,
  palette: {
    mode: 'light',
    ...lightPalette,
  },
});

export const darkTheme = createTheme({
  ...sharedOptions,
  palette: {
    mode: 'dark',
    ...darkPalette,
  },
});

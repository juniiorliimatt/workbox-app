import { createTheme, Theme } from '@mui/material';
import type { PaletteOptions } from '@mui/material';

export type ResolvedColorMode = 'light' | 'dark';

/**
 * Tema claro: a identidade original do app (primário preto, secundário roxo, fundo #f4f6f8).
 * Tema escuro: os mesmos papéis de cor, com tons que passam no contraste AA (4.5:1) sobre o fundo escuro — o primário preto
 * sumiria, então vira cinza claro; o roxo vira lilás.
 */
const PALETTE: Record<ResolvedColorMode, PaletteOptions> = {
  light: {
    mode: 'light',
    primary: { main: '#000000' },
    secondary: { main: '#9c27b0' },
    background: { default: '#f4f6f8' },
  },
  dark: {
    mode: 'dark',
    primary: { main: '#e0e0e0' },
    secondary: { main: '#ce93d8' },
    background: { default: '#121212', paper: '#1e1e1e' },
  },
};

/** Constrói o tema do MUI para o modo pedido: só a paleta muda entre os dois, o resto (tipografia, formas) é compartilhado. */
export const buildTheme = (mode: ResolvedColorMode): Theme =>
  createTheme({
    palette: PALETTE[mode],
    typography: {
      fontFamily: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'].join(','),
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      // A barra de navegação é a marca do app: preta com texto branco nos dois temas (no escuro o primário é claro,
      // então a barra não pode herdá-lo).
      MuiAppBar: {
        styleOverrides: {
          colorPrimary: {
            backgroundColor: '#000',
            color: '#fff',
          },
        },
      },
    },
  });

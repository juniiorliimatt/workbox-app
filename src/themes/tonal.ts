import { alpha, Theme } from '@mui/material';

export type TonalKind = 'success' | 'warning' | 'error' | 'info';

/**
 * Texto do chip tonal no tema claro: tons escuros escolhidos para passar no contraste AA (4.5:1) sobre o fundo translúcido.
 * (`palette[kind].dark` não serve: o laranja do warning dá ~3:1.)
 */
const LIGHT_TEXT: Record<TonalKind, string> = {
  success: '#1b5e20',
  warning: '#8a3b00',
  error: '#b71c1c',
  info: '#01579b',
};

/** Idem no tema escuro: tons claros. O vermelho `light` padrão do MUI (#e57373) dá 4,47:1, então o erro usa um tom mais claro. */
const DARK_TEXT: Record<TonalKind, string> = {
  success: '#81c784',
  warning: '#ffb74d',
  error: '#ef9a9a',
  info: '#4fc3f7',
};

/**
 * Estilo de chip de status (pago/pendente, oculto/visível...) que acompanha o tema: fundo translúcido da cor do tipo e texto
 * com contraste AA nos dois modos. Substitui pares de hex fixos (`#e8f5e9`/`#2e7d32`) que ficavam ofuscantes no escuro.
 * Uso: `sx={[{ fontWeight: 500 }, tonalSx('success')]}`.
 */
export const tonalSx = (kind: TonalKind) => (theme: Theme) => {
  const dark = theme.palette.mode === 'dark';
  return {
    bgcolor: alpha(theme.palette[kind].main, dark ? 0.2 : 0.12),
    color: dark ? DARK_TEXT[kind] : LIGHT_TEXT[kind],
  };
};

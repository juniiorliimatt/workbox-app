import { FC, ReactNode, useCallback, useMemo, useState } from 'react';
import { ThemeProvider, useMediaQuery } from '@mui/material';
import { ColorModeContext } from '@/contexts/ColorModeContextValue';
import { buildTheme, ResolvedColorMode } from '@/themes';
import { ColorModePreference, readColorModePreference, writeColorModePreference } from '@/themes/colorModeStorage';

/**
 * Tema claro/escuro do app: guarda a escolha do usuário (`localStorage`), resolve "seguir o sistema" por
 * `prefers-color-scheme` (acompanhando mudanças em tempo real) e entrega o tema ao MUI. Substitui o `ThemeProvider`.
 */
export const ColorModeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ColorModePreference>(readColorModePreference);
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const mode: ResolvedColorMode = preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference;
  const theme = useMemo(() => buildTheme(mode), [mode]);

  const setPreference = useCallback((next: ColorModePreference) => {
    setPreferenceState(next);
    writeColorModePreference(next);
  }, []);

  const value = useMemo(() => ({ preference, mode, setPreference }), [preference, mode, setPreference]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ColorModeContext.Provider>
  );
};

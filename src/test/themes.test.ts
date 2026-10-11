import { describe, expect, it } from 'vitest';
import { Theme } from '@mui/material';
import { buildTheme } from '@/themes';
import { AA_TEXT, contrast, luminance } from './contrast';

const pairs = (theme: Theme): Array<[string, string, string]> => {
  const { palette } = theme;
  return [
    ['texto principal sobre o fundo', palette.text.primary, palette.background.default],
    ['texto principal sobre superfícies', palette.text.primary, palette.background.paper],
    ['texto secundário sobre o fundo', palette.text.secondary, palette.background.default],
    ['texto secundário sobre superfícies', palette.text.secondary, palette.background.paper],
    ['cor primária (texto de botão, ícone) sobre superfícies', palette.primary.main, palette.background.paper],
    ['cor primária sobre o fundo', palette.primary.main, palette.background.default],
    ['texto sobre a cor primária (botão contido)', palette.primary.contrastText, palette.primary.main],
    ['cor secundária sobre superfícies', palette.secondary.main, palette.background.paper],
    ['cor secundária sobre o fundo', palette.secondary.main, palette.background.default],
    ['texto sobre a cor secundária (avatar)', palette.secondary.contrastText, palette.secondary.main],
  ];
};

describe('themes', () => {
  it('o tema claro mantém a identidade atual (primário preto, secundário roxo, fundo #f4f6f8)', () => {
    const { palette } = buildTheme('light');

    expect(palette.mode).toBe('light');
    expect(palette.primary.main).toBe('#000000');
    expect(palette.secondary.main).toBe('#9c27b0');
    expect(palette.background.default).toBe('#f4f6f8');
  });

  it('o tema escuro tem fundo escuro e primário claro (preto sumiria no fundo)', () => {
    const { palette } = buildTheme('dark');

    expect(palette.mode).toBe('dark');
    expect(luminance(palette.background.default)).toBeLessThan(0.05);
    expect(luminance(palette.primary.main)).toBeGreaterThan(0.5);
  });

  it.each(['light', 'dark'] as const)('tema %s: pares de cor críticos passam no contraste AA (4.5:1)', (mode) => {
    const theme = buildTheme(mode);

    for (const [name, foreground, background] of pairs(theme)) {
      expect(contrast(foreground, background), `${mode}: ${name} (${foreground} sobre ${background})`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it.each(['light', 'dark'] as const)('tema %s: a barra de navegação continua preta com texto branco', (mode) => {
    const override = buildTheme(mode).components?.MuiAppBar?.styleOverrides?.colorPrimary as { backgroundColor: string; color: string };

    expect(override.backgroundColor).toBe('#000');
    expect(contrast(override.color, override.backgroundColor)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('os dois temas compartilham tipografia, formas e componentes (só a paleta muda)', () => {
    const light = buildTheme('light');
    const dark = buildTheme('dark');

    expect(dark.typography.fontFamily).toBe(light.typography.fontFamily);
    expect(dark.components?.MuiButton?.styleOverrides).toEqual(light.components?.MuiButton?.styleOverrides);
  });
});

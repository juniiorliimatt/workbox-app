import { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { describe, expect, it } from 'vitest';
import { buildTheme, ResolvedColorMode } from '@/themes';
import { useChartTheme } from '@/themes/useChartTheme';
import { AA_TEXT, contrast } from './contrast';

const wrapperFor = (mode: ResolvedColorMode) => {
  const theme = buildTheme(mode);
  return ({ children }: { children: ReactNode }) => <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

describe('useChartTheme (cores de eixo, grade e tooltip do recharts)', () => {
  it.each(['light', 'dark'] as const)('tema %s: usa os tokens do tema', (mode) => {
    const theme = buildTheme(mode);
    const { result } = renderHook(() => useChartTheme(), { wrapper: wrapperFor(mode) });

    expect(result.current.grid.stroke).toBe(theme.palette.divider);
    expect(result.current.axis.tick.fill).toBe(theme.palette.text.secondary);
    expect(result.current.axis.stroke).toBe(theme.palette.divider);
    expect(result.current.tooltip.contentStyle.backgroundColor).toBe(theme.palette.background.paper);
    expect(result.current.tooltip.contentStyle.color).toBe(theme.palette.text.primary);
    expect(result.current.legend.wrapperStyle.color).toBe(theme.palette.text.primary);
  });

  it.each(['light', 'dark'] as const)('tema %s: o texto dos eixos e do tooltip passa no contraste AA', (mode) => {
    const theme = buildTheme(mode);
    const { result } = renderHook(() => useChartTheme(), { wrapper: wrapperFor(mode) });

    expect(contrast(result.current.axis.tick.fill, theme.palette.background.paper)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(result.current.tooltip.contentStyle.color, result.current.tooltip.contentStyle.backgroundColor)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('os valores mudam entre os temas (o gráfico acompanha a troca)', () => {
    const light = renderHook(() => useChartTheme(), { wrapper: wrapperFor('light') }).result.current;
    const dark = renderHook(() => useChartTheme(), { wrapper: wrapperFor('dark') }).result.current;

    expect(light.axis.tick.fill).not.toBe(dark.axis.tick.fill);
    expect(light.tooltip.contentStyle.backgroundColor).not.toBe(dark.tooltip.contentStyle.backgroundColor);
  });
});

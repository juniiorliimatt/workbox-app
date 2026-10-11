import { describe, expect, it } from 'vitest';
import { TonalKind, tonalSx } from '@/themes/tonal';
import { buildTheme } from '@/themes';
import { AA_TEXT, blend, contrast } from './contrast';

const KINDS: TonalKind[] = ['success', 'warning', 'error', 'info'];

describe('tonalSx (chip de status com fundo translúcido)', () => {
  it.each(['light', 'dark'] as const)('tema %s: o texto passa no contraste AA sobre o fundo translúcido, para todos os tipos', (mode) => {
    const theme = buildTheme(mode);

    for (const kind of KINDS) {
      const { bgcolor, color } = tonalSx(kind)(theme) as { bgcolor: string; color: string };
      const effectiveBackground = blend(bgcolor, theme.palette.background.paper);

      expect(contrast(color, effectiveBackground), `${mode}/${kind}: ${color} sobre ${effectiveBackground}`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('o fundo usa a cor do tipo (translúcida) e o texto muda entre os temas', () => {
    const light = tonalSx('success')(buildTheme('light')) as { bgcolor: string; color: string };
    const dark = tonalSx('success')(buildTheme('dark')) as { bgcolor: string; color: string };

    expect(light.bgcolor).toMatch(/^rgba\(/);
    expect(light.color).not.toBe(dark.color);
  });

  it('funciona dentro de um array de sx (como o MUI espera para misturar objeto e função)', () => {
    const sx = [{ fontWeight: 500 }, tonalSx('warning')];

    expect(Array.isArray(sx)).toBe(true);
    expect(typeof sx[1]).toBe('function');
  });
});

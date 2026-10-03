import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@/utils/format';

describe('formatCurrency', () => {
  it('formats numbers as BRL', () => {
    expect(formatCurrency(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50');
    expect(formatCurrency(0).replace(/\s/g, ' ')).toBe('R$ 0,00');
  });

  it('formats negatives', () => {
    expect(formatCurrency(-10).replace(/\s/g, ' ')).toContain('10,00');
    expect(formatCurrency(-10)).toContain('-');
  });

  it('treats null, undefined and NaN as zero', () => {
    expect(formatCurrency(null).replace(/\s/g, ' ')).toBe('R$ 0,00');
    expect(formatCurrency(undefined).replace(/\s/g, ' ')).toBe('R$ 0,00');
    expect(formatCurrency(Number.NaN).replace(/\s/g, ' ')).toBe('R$ 0,00');
  });
});

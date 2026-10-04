import { describe, it, expect } from 'vitest';
import { formatBytes } from '@/utils/format';

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1024, '1,0 KB'],
    [1536, '1,5 KB'],
    [2_621_440, '2,5 MB'],
    [1_073_741_824, '1,0 GB'],
  ])('formata %i como %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });

  it('devolve traço para valor inválido ou negativo', () => {
    expect(formatBytes(-1)).toBe('—');
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(undefined)).toBe('—');
    expect(formatBytes(Number.NaN)).toBe('—');
  });
});

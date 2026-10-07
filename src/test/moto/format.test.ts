import { describe, expect, it } from 'vitest';
import {
  FUEL_TYPE_LABEL,
  OIL_TYPE_LABEL,
  formatDate,
  formatKm,
  formatKmPerLiter,
  formatLiters,
  formatPct,
  formatPerLiter,
} from '@/pages/moto/format';
import { plain } from './helpers';

describe('moto · format', () => {
  it('formatKm usa separador de milhar pt-BR e trata ausência', () => {
    expect(formatKm(1234)).toBe('1.234 km');
    expect(formatKm(0)).toBe('0 km');
    expect(formatKm(-100)).toBe('-100 km');
    expect(formatKm(null)).toBe('—');
    expect(formatKm(undefined)).toBe('—');
  });

  it('formatKmPerLiter tem 2 casas e vírgula; nulo vira traço', () => {
    expect(formatKmPerLiter(37.5)).toBe('37,50 km/l');
    expect(formatKmPerLiter(26.666)).toBe('26,67 km/l');
    expect(formatKmPerLiter(null)).toBe('—');
  });

  it('formatPerLiter é reais por litro', () => {
    expect(plain(formatPerLiter(6.333))).toBe('R$ 6,33/L');
    expect(formatPerLiter(null)).toBe('—');
  });

  it('formatLiters', () => {
    expect(formatLiters(5)).toBe('5,00 L');
    expect(formatLiters(10.5)).toBe('10,50 L');
  });

  it('formatPct tem sinal explícito e trata nulo', () => {
    expect(formatPct(-13.64)).toBe('−13,64%');
    expect(formatPct(8.2)).toBe('+8,20%');
    expect(formatPct(0)).toBe('0,00%');
    expect(formatPct(null)).toBe('—');
  });

  it('formatDate é DD/MM/AAAA', () => {
    expect(formatDate('2026-02-05')).toBe('05/02/2026');
  });

  it('rótulos cobrem todos os tipos da API', () => {
    expect(Object.keys(FUEL_TYPE_LABEL).sort()).toEqual(['ETANOL', 'GASOLINA_ADITIVADA', 'GASOLINA_COMUM']);
    expect(Object.keys(OIL_TYPE_LABEL).sort()).toEqual(['MINERAL', 'SEMI_SYNTHETIC', 'SYNTHETIC']);
    expect(OIL_TYPE_LABEL.SEMI_SYNTHETIC).toBe('Semissintético');
  });
});

import { describe, expect, it } from 'vitest';
import {
  FUEL_TYPE_LABEL,
  OIL_TYPE_LABEL,
  formatDate,
  formatKm,
  formatKmPerDay,
  formatKmPerLiter,
  formatLiters,
  formatPerKm,
  formatPct,
  formatPerLiter,
  formatRemainingDays,
  formatRemainingKm,
  pluralize,
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

  it('formatKmPerDay tem 2 casas; nulo vira traço', () => {
    expect(formatKmPerDay(9.68)).toBe('9,68 km/dia');
    expect(formatKmPerDay(0)).toBe('0,00 km/dia');
    expect(formatKmPerDay(null)).toBe('—');
  });

  it('formatPerKm é reais por km', () => {
    expect(plain(formatPerKm(0.21))).toBe('R$ 0,21/km');
    expect(formatPerKm(null)).toBe('—');
  });

  it('pluralize concorda com a quantidade e usa milhar pt-BR', () => {
    expect(pluralize(1, 'dia', 'dias')).toBe('1 dia');
    expect(pluralize(0, 'dia', 'dias')).toBe('0 dias');
    expect(pluralize(122, 'dia', 'dias')).toBe('122 dias');
    expect(pluralize(1500, 'mês', 'meses')).toBe('1.500 meses');
  });

  it('formatRemainingKm: faltam, vencida há, ou limite atingido', () => {
    expect(formatRemainingKm(1000)).toBe('Faltam 1.000 km');
    expect(formatRemainingKm(-100)).toBe('Vencida há 100 km');
    expect(formatRemainingKm(0)).toBe('Vencimento atingido');
  });

  it('formatRemainingDays: faltam, vence hoje, ou vencida há (singular e plural)', () => {
    expect(formatRemainingDays(122)).toBe('Faltam 122 dias');
    expect(formatRemainingDays(1)).toBe('Faltam 1 dia');
    expect(formatRemainingDays(0)).toBe('Vence hoje');
    expect(formatRemainingDays(-1)).toBe('Vencida há 1 dia');
    expect(formatRemainingDays(-30)).toBe('Vencida há 30 dias');
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

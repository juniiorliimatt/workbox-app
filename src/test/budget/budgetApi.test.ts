import { describe, it, expect, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { loadOrcamentos } from '@/services/budgetApi';

const rule = (m: number) => ({
  totalRevenue: 1000 * m,
  essential: { actual: 100 * m, target: 0, difference: 0 },
  personal: { actual: 10 * m, target: 0, difference: 0 },
  savings: { actual: m, target: 0, difference: 0 },
});

const makeApi = (overrides?: Record<string, (params: Record<string, unknown>) => unknown>) => {
  const get = vi.fn((url: string, config?: { params?: Record<string, unknown> }) => {
    const params = config?.params ?? {};
    const custom = overrides?.[url];
    if (custom) {
      const out = custom(params);
      if (out instanceof Error) return Promise.reject(out);
      return Promise.resolve({ data: out });
    }
    switch (url) {
      case '/api/v1/revenues/total':
        return Promise.resolve({ data: { total: 5000 } });
      case '/api/v1/spendings/total':
        return Promise.resolve({ data: { total: 3000 } });
      case '/api/v1/budget-rules/fifty-thirty-twenty':
        return Promise.resolve({ data: rule(Number(params.month ?? 0)) });
      case '/api/v1/budget-rules/monthly-summary':
        return Promise.resolve({ data: { totalRevenue: 5000, totalSpending: 3000, totalPaid: 2000, totalPending: 1000, projectedBalance: 2000 } });
      case '/api/v1/budget-rules/yearly-summary':
        return Promise.resolve({ data: { totalRevenue: 60000, totalSpending: 36000, balance: 24000 } });
      case '/api/v1/revenues/by-type':
        return Promise.resolve({ data: params.month ? [{ typeId: 'r1', typeName: 'Salário (mês)', total: 5000 }] : [{ typeId: 'r1', typeName: 'Salário (ano)', total: 60000 }] });
      case '/api/v1/spendings/by-type':
        return Promise.resolve({ data: params.month ? [{ typeId: 's1', typeName: 'Aluguel (mês)', total: 1500 }] : [{ typeId: 's1', typeName: 'Aluguel (ano)', total: 18000 }] });
      default:
        return Promise.reject(new Error(`url inesperada: ${url}`));
    }
  });
  return { get } as unknown as AxiosInstance & { get: ReturnType<typeof vi.fn> };
};

describe('loadOrcamentos', () => {
  it('maps totals, summaries and rule data', async () => {
    const data = await loadOrcamentos(makeApi(), { month: 3, year: 2026 });

    expect(data.revTotal).toBe(5000);
    expect(data.spendTotal).toBe(3000);
    expect(data.summary.projectedBalance).toBe(2000);
    expect(data.yearly.balance).toBe(24000);
    expect(data.rule.totalRevenue).toBe(3000);
  });

  it('asks the server for by-type totals of the month instead of downloading raw rows', async () => {
    const api = makeApi();

    const data = await loadOrcamentos(api, { month: 3, year: 2026 });

    const calls = api.get.mock.calls.map((c) => [c[0], c[1]?.params]);
    expect(calls).toContainEqual(['/api/v1/revenues/by-type', { month: 3, year: 2026 }]);
    expect(calls).toContainEqual(['/api/v1/spendings/by-type', { month: 3, year: 2026 }]);
    expect(calls).toContainEqual(['/api/v1/revenues/by-type', { year: 2026 }]);
    expect(calls).toContainEqual(['/api/v1/spendings/by-type', { year: 2026 }]);
    expect(api.get.mock.calls.some((c) => c[0] === '/api/v1/revenues' || c[0] === '/api/v1/spendings')).toBe(false);
    expect(data.monthlyRevenuesByType[0].typeName).toBe('Salário (mês)');
    expect(data.revenuesByType[0].typeName).toBe('Salário (ano)');
    expect(data.monthlySpendingsByType[0].typeName).toBe('Aluguel (mês)');
    expect(data.spendingsByType[0].typeName).toBe('Aluguel (ano)');
  });

  it('builds the 12-point yearly chart from the 50/30/20 rule of each month', async () => {
    const data = await loadOrcamentos(makeApi(), { month: 3, year: 2026 });

    expect(data.yearlyChart).toHaveLength(12);
    expect(data.yearlyChart[0]).toEqual({ monthName: 'Jan', receitas: 1000, despesas: 111, essenciais: 100, pessoais: 10, poupanca: 1 });
    expect(data.yearlyChart[11].monthName).toBe('Dez');
    expect(data.yearlyChart[11].receitas).toBe(12000);
  });

  it('keeps going when a single month of the chart fails, using zeros for it', async () => {
    const api = makeApi({
      '/api/v1/budget-rules/fifty-thirty-twenty': (params) => (params.month === 7 ? new Error('falhou') : rule(Number(params.month))),
    });

    const data = await loadOrcamentos(api, { month: 3, year: 2026 });

    expect(data.yearlyChart[6]).toEqual({ monthName: 'Jul', receitas: 0, despesas: 0, essenciais: 0, pessoais: 0, poupanca: 0 });
    expect(data.yearlyChart[0].receitas).toBe(1000);
  });

  it('rejects when a main request fails (so the page can tell the user)', async () => {
    const api = makeApi({ '/api/v1/revenues/total': () => new Error('500') });

    await expect(loadOrcamentos(api, { month: 3, year: 2026 })).rejects.toThrow('500');
  });

  it('forwards the abort signal to every request', async () => {
    const api = makeApi();
    const signal = new AbortController().signal;

    await loadOrcamentos(api, { month: 3, year: 2026 }, signal);

    expect(api.get.mock.calls.every((c) => c[1]?.signal === signal)).toBe(true);
  });
});

import { describe, it, expect, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { loadChartView, loadMonthlyView, loadYearlyView } from '@/services/budgetApi';

const rule = (m: number) => ({
  totalRevenue: 1000 * m,
  essential: { actual: 100 * m, target: 0, difference: 0 },
  personal: { actual: 10 * m, target: 0, difference: 0 },
  savings: { actual: m, target: 0, difference: 0 },
});

const series = () =>
  Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    totalRevenue: 1000 * (i + 1),
    essential: 100 * (i + 1),
    personal: 10 * (i + 1),
    savings: i + 1,
  }));

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
      case '/api/v1/budget-rules/monthly-series':
        return Promise.resolve({ data: series() });
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

describe('budgetApi — uma função por aba', () => {
  it('monthly view: summary, 50/30/20 buckets and by-type totals of the month, with no yearly or series calls', async () => {
    const api = makeApi();

    const data = await loadMonthlyView(api, { month: 3, year: 2026 });

    expect(data.summary.projectedBalance).toBe(2000);
    expect(data.rule.totalRevenue).toBe(3000);
    expect(data.revenuesByType[0].typeName).toBe('Salário (mês)');
    expect(data.spendingsByType[0].typeName).toBe('Aluguel (mês)');
    const urls = api.get.mock.calls.map((c) => c[0]);
    expect(urls.sort()).toEqual([
      '/api/v1/budget-rules/fifty-thirty-twenty',
      '/api/v1/budget-rules/monthly-summary',
      '/api/v1/revenues/by-type',
      '/api/v1/spendings/by-type',
    ]);
    expect(api.get.mock.calls.every((c) => c[1]?.params?.month === 3 && c[1]?.params?.year === 2026)).toBe(true);
  });

  it('monthly view never downloads raw rows', async () => {
    const api = makeApi();

    await loadMonthlyView(api, { month: 3, year: 2026 });

    expect(api.get.mock.calls.some((c) => c[0] === '/api/v1/revenues' || c[0] === '/api/v1/spendings')).toBe(false);
  });

  it('yearly view: only the yearly summary and the by-type totals of the year', async () => {
    const api = makeApi();

    const data = await loadYearlyView(api, 2026);

    expect(data.yearly.balance).toBe(24000);
    expect(data.revenuesByType[0].typeName).toBe('Salário (ano)');
    expect(data.spendingsByType[0].typeName).toBe('Aluguel (ano)');
    expect(api.get.mock.calls.map((c) => c[0]).sort()).toEqual([
      '/api/v1/budget-rules/yearly-summary',
      '/api/v1/revenues/by-type',
      '/api/v1/spendings/by-type',
    ]);
    expect(api.get.mock.calls.every((c) => JSON.stringify(c[1]?.params) === JSON.stringify({ year: 2026 }))).toBe(true);
  });

  it('chart view: a single monthly-series call mapped to 12 points', async () => {
    const api = makeApi();

    const chart = await loadChartView(api, 2026);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get.mock.calls[0][0]).toBe('/api/v1/budget-rules/monthly-series');
    expect(api.get.mock.calls[0][1].params).toEqual({ year: 2026 });
    expect(chart).toHaveLength(12);
    expect(chart[0]).toEqual({ monthName: 'Jan', receitas: 1000, despesas: 111, essenciais: 100, pessoais: 10, poupanca: 1 });
    expect(chart[11]).toMatchObject({ monthName: 'Dez', receitas: 12000 });
  });

  it('chart view fills zeros for months missing in the series', async () => {
    const api = makeApi({ '/api/v1/budget-rules/monthly-series': () => [{ month: 2, totalRevenue: 50, essential: 5, personal: 0, savings: 0 }] });

    const chart = await loadChartView(api, 2026);

    expect(chart[0]).toEqual({ monthName: 'Jan', receitas: 0, despesas: 0, essenciais: 0, pessoais: 0, poupanca: 0 });
    expect(chart[1]).toMatchObject({ monthName: 'Fev', receitas: 50, despesas: 5 });
  });

  it('every view rejects when its request fails, so the page can tell the user', async () => {
    await expect(loadMonthlyView(makeApi({ '/api/v1/budget-rules/monthly-summary': () => new Error('500') }), { month: 3, year: 2026 })).rejects.toThrow('500');
    await expect(loadYearlyView(makeApi({ '/api/v1/budget-rules/yearly-summary': () => new Error('500') }), 2026)).rejects.toThrow('500');
    await expect(loadChartView(makeApi({ '/api/v1/budget-rules/monthly-series': () => new Error('500') }), 2026)).rejects.toThrow('500');
  });

  it('forwards the abort signal to every request of every view', async () => {
    const api = makeApi();
    const signal = new AbortController().signal;

    await loadMonthlyView(api, { month: 3, year: 2026 }, signal);
    await loadYearlyView(api, 2026, signal);
    await loadChartView(api, 2026, signal);

    expect(api.get.mock.calls.every((c) => c[1]?.signal === signal)).toBe(true);
  });
});

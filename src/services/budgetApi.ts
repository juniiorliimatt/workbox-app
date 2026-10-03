import { AxiosInstance } from 'axios';
import {
  FiftyThirtyTwentyDTO,
  MonthlySeriesPointDTO,
  MonthlySummaryDTO,
  TypeTotalDTO,
  YearlyChartPoint,
  YearlySummaryDTO,
} from '@/interfaces/budget';

/** Cliente do budget-service usado pela tela de Metas e Orçamentos (contrato: budget-service/openapi/openapi.yaml). */

export interface OrcamentosFilter {
  month: number;
  year: number;
}

/** Aba "Visão Mensal": resumo do mês, fatias 50/30/20 e totais por tipo do mês. */
export interface MonthlyViewData {
  rule: FiftyThirtyTwentyDTO;
  summary: MonthlySummaryDTO;
  revenuesByType: TypeTotalDTO[];
  spendingsByType: TypeTotalDTO[];
}

/** Aba "Visão Anual": resumo do ano e totais por tipo do ano. */
export interface YearlyViewData {
  yearly: YearlySummaryDTO;
  revenuesByType: TypeTotalDTO[];
  spendingsByType: TypeTotalDTO[];
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const EMPTY_POINT = { receitas: 0, despesas: 0, essenciais: 0, pessoais: 0, poupanca: 0 };

const toChartPoint = (monthName: string, point: MonthlySeriesPointDTO | undefined): YearlyChartPoint => {
  if (!point) return { monthName, ...EMPTY_POINT };
  const essenciais = point.essential || 0;
  const pessoais = point.personal || 0;
  const poupanca = point.savings || 0;
  return { monthName, receitas: point.totalRevenue || 0, despesas: essenciais + pessoais + poupanca, essenciais, pessoais, poupanca };
};

/** Cada aba tem o seu carregador — a tela só chama o da aba exibida (ver `useLazyTabData`). */

export const loadMonthlyView = async (api: AxiosInstance, { month, year }: OrcamentosFilter, signal?: AbortSignal): Promise<MonthlyViewData> => {
  const params = { month, year };
  const [rule, summary, revenuesByType, spendingsByType] = await Promise.all([
    api.get<FiftyThirtyTwentyDTO>('/api/v1/budget-rules/fifty-thirty-twenty', { params, signal }),
    api.get<MonthlySummaryDTO>('/api/v1/budget-rules/monthly-summary', { params, signal }),
    api.get<TypeTotalDTO[]>('/api/v1/revenues/by-type', { params, signal }),
    api.get<TypeTotalDTO[]>('/api/v1/spendings/by-type', { params, signal }),
  ]);
  return { rule: rule.data, summary: summary.data, revenuesByType: revenuesByType.data || [], spendingsByType: spendingsByType.data || [] };
};

export const loadYearlyView = async (api: AxiosInstance, year: number, signal?: AbortSignal): Promise<YearlyViewData> => {
  const params = { year };
  const [yearly, revenuesByType, spendingsByType] = await Promise.all([
    api.get<YearlySummaryDTO>('/api/v1/budget-rules/yearly-summary', { params, signal }),
    api.get<TypeTotalDTO[]>('/api/v1/revenues/by-type', { params, signal }),
    api.get<TypeTotalDTO[]>('/api/v1/spendings/by-type', { params, signal }),
  ]);
  return { yearly: yearly.data, revenuesByType: revenuesByType.data || [], spendingsByType: spendingsByType.data || [] };
};

/** Série anual 50/30/20 numa chamada só (`monthly-series`); meses ausentes viram zeros. */
export const loadChartView = async (api: AxiosInstance, year: number, signal?: AbortSignal): Promise<YearlyChartPoint[]> => {
  const { data } = await api.get<MonthlySeriesPointDTO[]>('/api/v1/budget-rules/monthly-series', { params: { year }, signal });
  return MONTH_NAMES.map((name, i) => toChartPoint(name, (data || []).find((p) => p.month === i + 1)));
};

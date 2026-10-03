import { AxiosInstance } from 'axios';
import {
  FiftyThirtyTwentyDTO,
  MonthlySeriesPointDTO,
  MonthlySummaryDTO,
  TotalDTO,
  TypeTotalDTO,
  YearlyChartPoint,
  YearlySummaryDTO,
} from '@/interfaces/budget';

/** Cliente do budget-service usado pela tela de Metas e Orçamentos (contrato: budget-service/openapi/openapi.yaml). */

export interface OrcamentosFilter {
  month: number;
  year: number;
}

export interface OrcamentosData {
  revTotal: number;
  spendTotal: number;
  rule: FiftyThirtyTwentyDTO;
  summary: MonthlySummaryDTO;
  yearly: YearlySummaryDTO;
  revenuesByType: TypeTotalDTO[];
  spendingsByType: TypeTotalDTO[];
  monthlyRevenuesByType: TypeTotalDTO[];
  monthlySpendingsByType: TypeTotalDTO[];
  yearlyChart: YearlyChartPoint[];
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

/**
 * Carrega tudo da tela em paralelo (10 chamadas). Totais por tipo (anual e do mês) e a série anual
 * 50/30/20 (`monthly-series`) vêm agregados do servidor. Se só a série falhar, o gráfico anual
 * mostra zeros e a tela segue utilizável; qualquer outra falha rejeita.
 */
export const loadOrcamentos = async (api: AxiosInstance, { month, year }: OrcamentosFilter, signal?: AbortSignal): Promise<OrcamentosData> => {
  const monthParams = { month, year };
  const yearParams = { year };

  const [revTotal, spendTotal, rule, summary, yearly, revenuesByType, spendingsByType, monthlyRevenuesByType, monthlySpendingsByType, series] =
    await Promise.all([
      api.get<TotalDTO>('/api/v1/revenues/total', { params: monthParams, signal }),
      api.get<TotalDTO>('/api/v1/spendings/total', { params: monthParams, signal }),
      api.get<FiftyThirtyTwentyDTO>('/api/v1/budget-rules/fifty-thirty-twenty', { params: monthParams, signal }),
      api.get<MonthlySummaryDTO>('/api/v1/budget-rules/monthly-summary', { params: monthParams, signal }),
      api.get<YearlySummaryDTO>('/api/v1/budget-rules/yearly-summary', { params: yearParams, signal }),
      api.get<TypeTotalDTO[]>('/api/v1/revenues/by-type', { params: yearParams, signal }),
      api.get<TypeTotalDTO[]>('/api/v1/spendings/by-type', { params: yearParams, signal }),
      api.get<TypeTotalDTO[]>('/api/v1/revenues/by-type', { params: monthParams, signal }),
      api.get<TypeTotalDTO[]>('/api/v1/spendings/by-type', { params: monthParams, signal }),
      api
        .get<MonthlySeriesPointDTO[]>('/api/v1/budget-rules/monthly-series', { params: yearParams, signal })
        .then((res) => res.data)
        .catch(() => [] as MonthlySeriesPointDTO[]),
    ]);

  return {
    revTotal: revTotal.data.total || 0,
    spendTotal: spendTotal.data.total || 0,
    rule: rule.data,
    summary: summary.data,
    yearly: yearly.data,
    revenuesByType: revenuesByType.data || [],
    spendingsByType: spendingsByType.data || [],
    monthlyRevenuesByType: monthlyRevenuesByType.data || [],
    monthlySpendingsByType: monthlySpendingsByType.data || [],
    yearlyChart: MONTH_NAMES.map((name, i) => toChartPoint(name, series.find((p) => p.month === i + 1))),
  };
};

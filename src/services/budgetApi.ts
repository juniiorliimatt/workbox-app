import { AxiosInstance } from 'axios';
import {
  FiftyThirtyTwentyDTO,
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

const toChartPoint = (monthName: string, rule: FiftyThirtyTwentyDTO | null): YearlyChartPoint => {
  if (!rule) return { monthName, ...EMPTY_POINT };
  const essenciais = rule.essential?.actual || 0;
  const pessoais = rule.personal?.actual || 0;
  const poupanca = rule.savings?.actual || 0;
  return { monthName, receitas: rule.totalRevenue || 0, despesas: essenciais + pessoais + poupanca, essenciais, pessoais, poupanca };
};

/**
 * Carrega tudo da tela em paralelo. Totais por tipo vêm agregados do servidor (anual e do mês).
 * O gráfico anual ainda faz uma chamada por mês (não há endpoint de série); a falha de um mês
 * vira zeros, sem derrubar a tela. Qualquer outra falha rejeita.
 */
export const loadOrcamentos = async (api: AxiosInstance, { month, year }: OrcamentosFilter, signal?: AbortSignal): Promise<OrcamentosData> => {
  const monthParams = { month, year };
  const yearParams = { year };

  const monthSeries = Array.from({ length: 12 }, (_, i) =>
    api
      .get<FiftyThirtyTwentyDTO>('/api/v1/budget-rules/fifty-thirty-twenty', { params: { month: i + 1, year }, signal })
      .then((res) => res.data)
      .catch(() => null),
  );

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
      Promise.all(monthSeries),
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
    yearlyChart: series.map((point, i) => toChartPoint(MONTH_NAMES[i], point)),
  };
};

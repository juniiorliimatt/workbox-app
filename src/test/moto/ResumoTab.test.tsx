import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResumoTab from '@/pages/moto/ResumoTab';
import { IMonthlyStats, IOilStatus, IStats, IYearlyStats } from '@/interfaces/moto';
import { MOTO_ID, makeMonthly, makeMotorcycle, makeOilStatus, makeStats, makeYearly, plain, renderMoto } from './helpers';

const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));

// Os fluxos de diálogo digitam em vários campos MUI; com a suíte inteira em paralelo passam do limite padrão de 5 s.
vi.setConfig({ testTimeout: 20_000 });

const BASE = `/api/v1/motorcycles/${MOTO_ID}`;
const MOTO = makeMotorcycle();
const NOW = dayjs();
const YEAR = NOW.year();
const TODAY = NOW.format('YYYY-MM-DD');
const onChanged = vi.fn();

const problem = (detail: string) => Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status: 400, data: { detail } } });

interface Data {
  overall: IStats;
  month: IStats;
  yearly: IYearlyStats[];
  monthly: (year: number) => IMonthlyStats[];
  oil: IOilStatus;
}

const defaults = (): Data => ({
  overall: makeStats({ km: 700, kmPerDay: 10, kmPerLiter: 30.43, costPerKm: 0.21, pricePerLiter: 6.2, segmentCount: 3, lowConfidence: false, bestKmPerLiter: 40, worstKmPerLiter: 20 }),
  month: makeStats({ km: 150, totalSpent: 95, litersRefueled: 15 }),
  yearly: makeYearly([YEAR]),
  monthly: (year) => makeMonthly(year),
  oil: makeOilStatus(),
});

/** Responde cada rota; `/stats` distingue o resumo geral (sem período) do mês atual (com `from`). */
const mockData = (overrides: Partial<Data> = {}) => {
  const data = { ...defaults(), ...overrides };
  mockApi.get.mockImplementation(async (url: string, config?: { params?: { from?: string; year?: number } }) => {
    if (url === `${BASE}/stats`) return { data: config?.params?.from ? data.month : data.overall };
    if (url === `${BASE}/stats/monthly`) return { data: data.monthly(config?.params?.year ?? YEAR) };
    if (url === `${BASE}/stats/yearly`) return { data: data.yearly };
    if (url === `${BASE}/oil-status`) return { data: data.oil };
    throw new Error(`GET não previsto no teste: ${url}`);
  });
};

const renderTab = (active = true, refreshKey = 0) =>
  renderMoto(<ResumoTab motorcycle={MOTO} active={active} refreshKey={refreshKey} onChanged={onChanged} />);

const card = (name: string) => within(screen.getByRole('group', { name }));
const calls = (suffix: string) => mockApi.get.mock.calls.filter((c) => c[0] === `${BASE}${suffix}`);

describe('Moto · aba Resumo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData();
  });

  it('não busca nada enquanto a aba está oculta; ativa, busca geral, mês atual, anual, mensal e óleo', async () => {
    const { rerenderUi } = renderTab(false);
    expect(mockApi.get).not.toHaveBeenCalled();

    rerenderUi(<ResumoTab motorcycle={MOTO} active refreshKey={0} onChanged={onChanged} />);

    await screen.findByRole('group', { name: 'Consumo médio' });
    expect(calls('/stats')).toHaveLength(2);
    expect(calls('/stats').map((c) => c[1].params)).toContainEqual({});
    expect(calls('/stats').map((c) => c[1].params)).toContainEqual({
      from: NOW.startOf('month').format('YYYY-MM-DD'),
      to: NOW.endOf('month').format('YYYY-MM-DD'),
    });
    expect(calls('/stats/yearly')).toHaveLength(1);
    expect(calls('/stats/monthly')[0][1].params).toEqual({ year: YEAR });
    expect(calls('/oil-status')).toHaveLength(1);
  });

  it('mostra carregamento enquanto busca', () => {
    renderTab();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  describe('cards', () => {
    it('mostram consumo médio, km, gasto, custo por km e óleo, formatados', async () => {
      renderTab();
      await screen.findByRole('group', { name: 'Consumo médio' });

      expect(card('Consumo médio').getByText('30,43 km/l')).toBeInTheDocument();
      expect(card('Consumo médio').getByText('Melhor 40,00 km/l · Pior 20,00 km/l')).toBeInTheDocument();
      expect(card('Km rodados').getByText('700 km')).toBeInTheDocument();
      expect(card('Km rodados').getByText('10,00 km/dia')).toBeInTheDocument();
      expect(card('Km no mês').getByText('150 km')).toBeInTheDocument();
      expect(plain(card('Gasto no mês').getByText(/R\$\s95,00/).textContent)).toBe('R$ 95,00');
      expect(plain(card('Gasto no ano').getByText(/R\$\s205,00/).textContent)).toBe('R$ 205,00');
      expect(plain(card('Custo por km').getByText(/0,21\/km/).textContent)).toBe('R$ 0,21/km');
      expect(plain(card('Custo por km').getByText(/Preço médio do litro/).textContent)).toBe('Preço médio do litro: R$ 6,20/L');
      expect(card('Próxima troca de óleo').getByText('Em dia')).toBeInTheDocument();
      expect(card('Próxima troca de óleo').getByText('Faltam 1.000 km')).toBeInTheDocument();
    });

    it('baixa confiança aparece com explicação acessível; com confiança, não aparece', async () => {
      mockData({ overall: makeStats({ lowConfidence: true, segmentCount: 1, kmPerLiter: 37.5 }) });
      const { unmount } = renderTab();
      await screen.findByRole('group', { name: 'Consumo médio' });

      expect(card('Consumo médio').getByText('Baixa confiança')).toBeInTheDocument();
      expect(screen.getByLabelText('Poucos abastecimentos no período: a média pode variar')).toBeInTheDocument();
      unmount();

      mockData();
      renderTab();
      await screen.findByRole('group', { name: 'Consumo médio' });
      expect(screen.queryByText('Baixa confiança')).not.toBeInTheDocument();
    });

    it('valores ausentes viram traço, nunca "NaN", "null" ou "undefined"', async () => {
      mockData({
        overall: makeStats({ km: 0, kmPerDay: 0, kmPerLiter: null, costPerKm: null, pricePerLiter: null, bestKmPerLiter: null, worstKmPerLiter: null, segmentCount: 0, lowConfidence: true, totalSpent: 0 }),
        month: makeStats({ km: 0, totalSpent: 0, kmPerLiter: null }),
        yearly: [],
        oil: { lastChange: null, currentOdometerKm: 1000, dueDate: null, dueKm: null, kmRemaining: null, daysRemaining: null, level: null, limitedBy: null },
      });

      renderTab();
      await screen.findByRole('group', { name: 'Consumo médio' });

      expect(card('Consumo médio').getByText('—')).toBeInTheDocument();
      expect(card('Custo por km').getAllByText('—').length).toBeGreaterThan(0);
      expect(card('Próxima troca de óleo').getByText('Sem troca registrada')).toBeInTheDocument();
      expect(plain(card('Gasto no ano').getByText(/R\$\s0,00/).textContent)).toBe('R$ 0,00');
      expect(document.body.textContent).not.toMatch(/NaN|null|undefined/);
    });

    it('variação do gasto contra o mês anterior, com sinal e texto', async () => {
      mockData({ monthly: (year) => makeMonthly(year).map((m, i) => (i === NOW.month() ? { ...m, spentChangePct: -13.64 } : m)) });

      renderTab();

      const gasto = within(await screen.findByRole('group', { name: 'Gasto no mês' }));
      expect(await gasto.findByText('−13,64% vs. mês anterior')).toBeInTheDocument();
    });

    it('óleo vencido e perto aparecem em texto', async () => {
      mockData({ oil: makeOilStatus({ level: 'VENCIDA', kmRemaining: -100, limitedBy: 'KM' }) });
      const { unmount } = renderTab();
      await screen.findByRole('group', { name: 'Próxima troca de óleo' });
      expect(card('Próxima troca de óleo').getByText('Troca vencida')).toBeInTheDocument();
      expect(card('Próxima troca de óleo').getByText('Vencida há 100 km')).toBeInTheDocument();
      unmount();

      mockData({ oil: makeOilStatus({ level: 'PERTO', daysRemaining: 20, limitedBy: 'TIME' }) });
      renderTab();
      await screen.findByRole('group', { name: 'Próxima troca de óleo' });
      expect(card('Próxima troca de óleo').getByText('Troca próxima')).toBeInTheDocument();
      expect(card('Próxima troca de óleo').getByText('Faltam 20 dias')).toBeInTheDocument();
    });
  });

  describe('gráficos', () => {
    it('cada gráfico tem título e uma tabela equivalente para leitores de tela', async () => {
      renderTab();

      const consumo = await screen.findByRole('table', { name: 'Consumo por mês (km/l)' });
      const rows = within(consumo).getAllByRole('row');
      expect(rows).toHaveLength(13);
      expect(within(rows[1]).getByText('Janeiro')).toBeInTheDocument();
      expect(within(rows[1]).getByText('37,50 km/l')).toBeInTheDocument();
      expect(within(rows[3]).getByText('—')).toBeInTheDocument();

      const gasto = screen.getByRole('table', { name: 'Gasto por mês (R$)' });
      expect(plain(within(within(gasto).getAllByRole('row')[1]).getByText(/R\$\s110,00/).textContent)).toBe('R$ 110,00');
      const km = screen.getByRole('table', { name: 'Km rodados por mês' });
      expect(within(within(km).getAllByRole('row')[2]).getByText('400 km')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Consumo por mês (km/l)' })).toBeInTheDocument();
    });

    it('trocar o ano busca a série mensal daquele ano', async () => {
      const user = userEvent.setup();
      renderTab();
      await screen.findByRole('group', { name: 'Consumo médio' });

      await user.click(screen.getByRole('combobox', { name: 'Ano' }));
      await user.click(await screen.findByRole('option', { name: String(YEAR - 1) }));

      await waitFor(() => expect(calls('/stats/monthly').at(-1)?.[1].params).toEqual({ year: YEAR - 1 }));
    });

    it('ano sem abastecimento mostra o estado vazio no lugar dos gráficos', async () => {
      mockData({
        monthly: (year) =>
          makeMonthly(year).map((m) => ({ ...m, spentChangePct: null, stats: makeStats({ km: 0, totalSpent: 0, kmPerLiter: null, segmentCount: 0 }) })),
      });

      renderTab();

      expect(await screen.findByText(`Sem abastecimentos em ${YEAR}`)).toBeInTheDocument();
      expect(screen.queryByRole('table', { name: 'Consumo por mês (km/l)' })).not.toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Consumo médio' })).toBeInTheDocument();
    });

    it('visão por ano só aparece com mais de um ano de dados', async () => {
      mockData({ yearly: makeYearly([YEAR - 1, YEAR]) });
      const { unmount } = renderTab();
      const table = await screen.findByRole('table', { name: 'Por ano' });
      const rows = within(table).getAllByRole('row');
      expect(within(rows[1]).getByText(String(YEAR - 1))).toBeInTheDocument();
      expect(within(rows[2]).getByText(String(YEAR))).toBeInTheDocument();
      unmount();

      mockData({ yearly: makeYearly([YEAR]) });
      renderTab();
      await screen.findByRole('group', { name: 'Consumo médio' });
      expect(screen.queryByRole('table', { name: 'Por ano' })).not.toBeInTheDocument();
    });
  });

  describe('carregamento', () => {
    it('falha mostra alerta, avisa e permite tentar de novo', async () => {
      const user = userEvent.setup();
      mockApi.get.mockRejectedValue(new Error('boom'));
      renderTab();

      expect(await screen.findByText('Não foi possível carregar as métricas.')).toBeInTheDocument();
      mockData();
      await user.click(screen.getByRole('button', { name: /Tentar novamente/i }));

      expect(await screen.findByRole('group', { name: 'Consumo médio' })).toBeInTheDocument();
    });

    it('recarrega quando outra aba muda os dados (refreshKey)', async () => {
      const { rerenderUi } = renderTab(true, 0);
      await screen.findByRole('group', { name: 'Consumo médio' });
      const before = calls('/stats/yearly').length;

      rerenderUi(<ResumoTab motorcycle={MOTO} active refreshKey={1} onChanged={onChanged} />);

      await waitFor(() => expect(calls('/stats/yearly').length).toBe(before + 1));
    });
  });

  describe('atualizar km', () => {
    const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(await screen.findByRole('button', { name: 'Atualizar km' }));
      return within(await screen.findByRole('dialog', { name: 'Atualizar km' }));
    };

    it('abre com o hodômetro atual e grava uma leitura avulsa de hoje', async () => {
      const user = userEvent.setup();
      mockApi.post.mockResolvedValue({ data: {} });
      renderTab();
      const form = await openDialog(user);
      expect(form.getByLabelText(/^Hodômetro/)).toHaveValue('23000');

      await user.clear(form.getByLabelText(/^Hodômetro/));
      await user.type(form.getByLabelText(/^Hodômetro/), '23250');
      await user.click(form.getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith(`${BASE}/odometer-readings`, { date: TODAY, odometerKm: 23250 }));
      expect(await screen.findByText('Km atualizado!')).toBeInTheDocument();
      // Quem recarrega é a página (onChanged → refreshKey), não um estado local: evita buscar duas vezes.
      expect(onChanged).toHaveBeenCalledTimes(1);
      expect(calls('/stats/yearly')).toHaveLength(1);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it.each([
      ['', 'Hodômetro é obrigatório'],
      ['-5', 'Hodômetro não pode ser negativo'],
      ['12,5', 'Informe um número inteiro'],
    ])('valida hodômetro "%s"', async (value, message) => {
      const user = userEvent.setup();
      renderTab();
      const form = await openDialog(user);
      await user.clear(form.getByLabelText(/^Hodômetro/));
      if (value) await user.type(form.getByLabelText(/^Hodômetro/), value);

      await user.click(form.getByRole('button', { name: 'Salvar' }));

      expect(await form.findByText(message)).toBeInTheDocument();
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('hodômetro fora de ordem: mostra o motivo da API e mantém o diálogo aberto', async () => {
      const user = userEvent.setup();
      mockApi.post.mockRejectedValue(problem('Hodômetro (100 km) menor que o registro de 2026-02-25 (1700 km)'));
      renderTab();
      const form = await openDialog(user);
      await user.clear(form.getByLabelText(/^Hodômetro/));
      await user.type(form.getByLabelText(/^Hodômetro/), '100');

      await user.click(form.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByText('Erro: Hodômetro (100 km) menor que o registro de 2026-02-25 (1700 km)')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(onChanged).not.toHaveBeenCalled();
    });
  });
});

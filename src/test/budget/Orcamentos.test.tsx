import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Orcamentos from '@/pages/financas/Orcamentos';
import { AuthContext } from '@/contexts/AuthContextValue';
import { SnackbarProvider } from '@/contexts/SnackbarContext';
import { createAuthValue } from '../forza/helpers';

const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn() } }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));

const respond = (url: string, params: Record<string, unknown> = {}) => {
  switch (url) {
    case '/api/v1/revenues/total':
      return { total: 5000 };
    case '/api/v1/spendings/total':
      return { total: 3000 };
    case '/api/v1/budget-rules/fifty-thirty-twenty':
      return { totalRevenue: 1000, essential: { actual: 500, target: 500, difference: 0 }, personal: { actual: 300, target: 300, difference: 0 }, savings: { actual: 200, target: 200, difference: 0 } };
    case '/api/v1/budget-rules/monthly-series':
      return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, totalRevenue: 0, essential: 0, personal: 0, savings: 0 }));
    case '/api/v1/budget-rules/monthly-summary':
      return { totalRevenue: 5000, totalSpending: 3000, totalPaid: 2000, totalPending: 1000, projectedBalance: 2000 };
    case '/api/v1/budget-rules/yearly-summary':
      return { totalRevenue: 60000, totalSpending: 36000, balance: 24000 };
    case '/api/v1/revenues/by-type':
      return [{ typeId: 'r1', typeName: params.month ? 'Salário do mês' : 'Salário do ano', total: 5000 }];
    case '/api/v1/spendings/by-type':
      return [{ typeId: 's1', typeName: params.month ? 'Aluguel do mês' : 'Aluguel do ano', total: 1500 }];
    default:
      throw new Error(`url inesperada ${url}`);
  }
};

const renderPage = () =>
  render(
    <AuthContext.Provider value={createAuthValue()}>
      <SnackbarProvider>
        <MemoryRouter>
          <Orcamentos />
        </MemoryRouter>
      </SnackbarProvider>
    </AuthContext.Provider>,
  );

const urlsCalled = () => mockApi.get.mock.calls.map((c) => c[0] as string);
const callsTo = (url: string) => mockApi.get.mock.calls.filter((c) => c[0] === url);

describe('Finanças · Metas e Orçamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => Promise.resolve({ data: respond(url, config?.params) }));
  });

  it('on open, loads only the monthly tab: summary in BRL, by-type lists of the month and the 50/30/20 buckets', async () => {
    renderPage();

    expect(await screen.findByText('Total de Receitas')).toBeInTheDocument();
    expect((await screen.findAllByText(/R\$\s?5\.000,00/)).length).toBeGreaterThan(0);
    expect(screen.getByText('Salário do mês')).toBeInTheDocument();
    expect(screen.getByText('Aluguel do mês')).toBeInTheDocument();
    expect(urlsCalled().sort()).toEqual([
      '/api/v1/budget-rules/fifty-thirty-twenty',
      '/api/v1/budget-rules/monthly-summary',
      '/api/v1/revenues/by-type',
      '/api/v1/spendings/by-type',
    ]);
  });

  it('does NOT load the yearly or chart data until their tabs are opened', async () => {
    renderPage();
    await screen.findByText('Total de Receitas');

    expect(callsTo('/api/v1/budget-rules/yearly-summary')).toHaveLength(0);
    expect(callsTo('/api/v1/budget-rules/monthly-series')).toHaveLength(0);
  });

  it('loads the yearly data only when "Visão Anual" is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Total de Receitas');

    await user.click(screen.getByRole('tab', { name: /Visão Anual/i }));

    expect((await screen.findAllByText(/R\$\s?60\.000,00/)).length).toBeGreaterThan(0);
    expect(screen.getByText('Salário do ano')).toBeInTheDocument();
    expect(callsTo('/api/v1/budget-rules/yearly-summary')).toHaveLength(1);
    expect(callsTo('/api/v1/budget-rules/monthly-series')).toHaveLength(0);
  });

  it('loads the chart series only when "Visão Gráfica" is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Total de Receitas');

    await user.click(screen.getByRole('tab', { name: /Visão Gráfica/i }));

    await waitFor(() => expect(callsTo('/api/v1/budget-rules/monthly-series')).toHaveLength(1));
    expect(callsTo('/api/v1/budget-rules/yearly-summary')).toHaveLength(0);
  });

  it('does not refetch when going back to a tab that was already loaded', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Total de Receitas');
    await user.click(screen.getByRole('tab', { name: /Visão Anual/i }));
    await screen.findByText('Salário do ano');
    const before = mockApi.get.mock.calls.length;

    await user.click(screen.getByRole('tab', { name: /Visão Mensal/i }));
    await user.click(screen.getByRole('tab', { name: /Visão Anual/i }));

    expect(await screen.findByText('Salário do ano')).toBeInTheDocument();
    expect(mockApi.get.mock.calls.length).toBe(before);
  });

  it('applying a new year reloads the visible tab and marks the others stale until opened', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Total de Receitas');
    await user.click(screen.getByRole('tab', { name: /Visão Anual/i }));
    await screen.findByText('Salário do ano');
    expect(callsTo('/api/v1/budget-rules/yearly-summary')).toHaveLength(1);

    await user.click(screen.getByRole('tab', { name: /Visão Mensal/i }));
    await screen.findByText('Total de Receitas');
    const yearInput = screen.getByLabelText('Ano');
    await user.clear(yearInput);
    await user.type(yearInput, '2025');
    await user.click(screen.getByRole('button', { name: /Filtrar/i }));

    await waitFor(() => expect(mockApi.get.mock.calls.some((c) => c[0] === '/api/v1/budget-rules/monthly-summary' && c[1]?.params?.year === 2025)).toBe(true));
    expect(callsTo('/api/v1/budget-rules/yearly-summary')).toHaveLength(1);

    await user.click(screen.getByRole('tab', { name: /Visão Anual/i }));
    await waitFor(() => expect(callsTo('/api/v1/budget-rules/yearly-summary')).toHaveLength(2));
    expect(callsTo('/api/v1/budget-rules/yearly-summary')[1][1].params).toEqual({ year: 2025 });
  });

  it('never downloads the raw revenue/spending lists', async () => {
    renderPage();
    await screen.findByText('Total de Receitas');

    expect(urlsCalled().some((u) => u === '/api/v1/revenues' || u === '/api/v1/spendings')).toBe(false);
  });

  it('tells the user when loading fails instead of failing silently', async () => {
    mockApi.get.mockRejectedValue(new Error('Network Error'));

    renderPage();

    expect(await screen.findByText(/Não foi possível carregar os dados de orçamento/i)).toBeInTheDocument();
  });

  it('retries a failed tab the next time it is opened', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Total de Receitas');
    mockApi.get.mockRejectedValueOnce(new Error('500'));
    await user.click(screen.getByRole('tab', { name: /Visão Anual/i }));
    await screen.findByText(/Não foi possível carregar os dados de orçamento/i);

    await user.click(screen.getByRole('tab', { name: /Visão Mensal/i }));
    mockApi.get.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => Promise.resolve({ data: respond(url, config?.params) }));
    await user.click(screen.getByRole('tab', { name: /Visão Anual/i }));

    expect(await screen.findByText('Salário do ano')).toBeInTheDocument();
  });

  it('aborts in-flight requests when leaving the page', async () => {
    mockApi.get.mockImplementation(() => new Promise(() => undefined));

    const { unmount } = renderPage();
    unmount();

    await waitFor(() => expect(mockApi.get).toHaveBeenCalled());
    expect(mockApi.get.mock.calls.every((c) => (c[1]?.signal as AbortSignal)?.aborted)).toBe(true);
  });
});

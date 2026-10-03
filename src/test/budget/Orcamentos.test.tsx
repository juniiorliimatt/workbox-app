import { render, screen, waitFor } from '@testing-library/react';
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

describe('Finanças · Metas e Orçamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the monthly summary in BRL and the by-type lists after loading', async () => {
    mockApi.get.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => Promise.resolve({ data: respond(url, config?.params) }));

    renderPage();

    expect((await screen.findAllByText(/R\$\s?5\.000,00/)).length).toBeGreaterThan(0);
    expect(screen.getByText('Total de Receitas')).toBeInTheDocument();
    expect(screen.getByText('Salário do mês')).toBeInTheDocument();
    expect(screen.getByText('Aluguel do mês')).toBeInTheDocument();
  });

  it('never downloads the raw revenue/spending lists', async () => {
    mockApi.get.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => Promise.resolve({ data: respond(url, config?.params) }));

    renderPage();
    await screen.findByText('Total de Receitas');

    expect(mockApi.get.mock.calls.some((c) => c[0] === '/api/v1/revenues' || c[0] === '/api/v1/spendings')).toBe(false);
  });

  it('tells the user when loading fails instead of failing silently', async () => {
    mockApi.get.mockRejectedValue(new Error('Network Error'));

    renderPage();

    expect(await screen.findByText(/Não foi possível carregar os dados de orçamento/i)).toBeInTheDocument();
  });

  it('does not report an error for a request aborted by leaving the page', async () => {
    mockApi.get.mockImplementation(() => new Promise(() => undefined));

    const { unmount } = renderPage();
    unmount();

    await waitFor(() => expect(mockApi.get).toHaveBeenCalled());
    const signals = mockApi.get.mock.calls.map((c) => c[1]?.signal as AbortSignal);
    expect(signals.every((s) => s?.aborted)).toBe(true);
  });
});

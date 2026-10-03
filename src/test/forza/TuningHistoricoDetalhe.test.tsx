import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TuningHistoricoDetalhe from '@/pages/forza/TuningHistoricoDetalhe';
import { makeRecommendation, renderAt } from './helpers';

const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));

const ID = '22222222-2222-2222-2222-222222222222';
const renderPage = () => renderAt(<TuningHistoricoDetalhe />, { path: '/forza/tuning/historico/:id', route: `/forza/tuning/historico/${ID}` });

const saved = (recommendation = makeRecommendation({ carOrdinal: 1105, carName: '1964 Aston Martin DB5 Vantage' })) => ({
  data: { id: ID, savedAt: '2026-10-03T19:50:00Z', recommendation },
});

describe('Forza · Tuning · histórico · detalhe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue(saved());
  });

  it('fetches the saved tuning by id and titles the page with the car', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: /1964 Aston Martin DB5 Vantage/i })).toBeInTheDocument();
    expect(mockApi.get.mock.calls[0][0]).toBe(`/api/v1/tuning/history/${ID}`);
  });

  it('says it is a snapshot saved at a given moment, not the current recommendation', async () => {
    renderPage();

    expect(await screen.findByText(/Tuning salvo em/i)).toBeInTheDocument();
    expect(screen.getByText(/foto do que foi recomendado na época/i)).toBeInTheDocument();
  });

  it('shows the cycle adjustments and EVERY guide exactly as saved', async () => {
    renderPage();

    const cycle = await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
    expect(within(cycle).getAllByRole('listitem')).toHaveLength(2);
    for (const title of ['Pneus', 'Câmbio', 'Alinhamento', 'Barras anti-rolagem', 'Molas', 'Amortecimento', 'Aerodinâmica', 'Freios', 'Diferencial']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${title}`) })).toBeInTheDocument();
    }
  });

  it('is read-only: no "Reiniciar coleta" action and no instruction to restart the collection', async () => {
    renderPage();
    await screen.findByRole('region', { name: /Aplicar neste ciclo/i });

    expect(screen.queryByRole('button', { name: /Reiniciar coleta/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/use “Reiniciar coleta”/i)).not.toBeInTheDocument();
  });

  it('does not show the collection-progress bars of a live recommendation', async () => {
    renderPage();
    await screen.findByRole('region', { name: /Aplicar neste ciclo/i });

    expect(screen.queryByLabelText('Progresso de sessões')).not.toBeInTheDocument();
    expect(screen.getByText(/Baseado em 12 sessões/)).toBeInTheDocument();
  });

  it('keeps the brake balance worded as a move toward the front/rear', async () => {
    const suggestion = { priority: 1, thisCycle: true, guide: 'freios', parameter: 'Equilíbrio de freio', axle: 'FRONT' as const, direction: 'INCREASE' as const, rationale: 'r', evidence: 'e' };
    mockApi.get.mockResolvedValue(saved(makeRecommendation({ thisCycle: [suggestion] })));

    renderPage();

    const cycle = await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
    expect(within(cycle).getByText(/Mover para a dianteira/)).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown id', async () => {
    mockApi.get.mockRejectedValue(Object.assign(new Error('404'), { isAxiosError: true, response: { status: 404 } }));

    renderPage();

    expect(await screen.findByText(/Tuning salvo não encontrado/i)).toBeInTheDocument();
  });

  it('shows an error with retry on other failures', async () => {
    const user = userEvent.setup();
    mockApi.get.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(saved());

    renderPage();
    expect(await screen.findByText(/Não foi possível carregar o tuning salvo/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Tentar novamente/i }));

    expect(await screen.findByRole('heading', { name: /1964 Aston Martin DB5 Vantage/i })).toBeInTheDocument();
  });
});

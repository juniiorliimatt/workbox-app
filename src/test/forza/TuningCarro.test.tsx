import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TuningCarro from '@/pages/forza/TuningCarro';
import { makeGuides, makeRecommendation, renderAt } from './helpers';

const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));

const renderPage = () => renderAt(<TuningCarro />, { path: '/forza/tuning/:carOrdinal', route: '/forza/tuning/3667' });

describe('Forza · Tuning · recomendação do carro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: makeRecommendation() });
    mockApi.post.mockResolvedValue({ status: 204 });
  });

  it('titles the page with the car and shows class/PI and drivetrain', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: /2021 Porsche 911 GT3/i })).toBeInTheDocument();
    expect(screen.getByText(/S1 · PI 812/)).toBeInTheDocument();
    expect(screen.getByText(/Traseira \(RWD\)/)).toBeInTheDocument();
    expect(mockApi.get.mock.calls[0][0]).toBe('/api/v1/tuning/cars/3667');
  });

  it('lists the cycle adjustments in order, with direction in words, axle, rationale and evidence', async () => {
    renderPage();

    const cycle = await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
    const items = within(cycle).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Altura do solo traseira')).toBeInTheDocument();
    expect(within(items[0]).getByText(/Aumentar/)).toBeInTheDocument();
    expect(within(items[0]).getByText('Traseira')).toBeInTheDocument();
    expect(within(items[0]).getByText(/fundo de curso em 7%/)).toBeInTheDocument();
    expect(within(items[1]).getByText(/Reduzir/)).toBeInTheDocument();
    expect(within(items[1]).getByText(/225 °F/)).toBeInTheDocument();
  });

  it('shows EVERY tuning guide of the game, even the ones with nothing to change', async () => {
    renderPage();

    await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
    for (const title of ['Pneus', 'Câmbio', 'Alinhamento', 'Barras anti-rolagem', 'Molas', 'Amortecimento', 'Aerodinâmica', 'Freios', 'Diferencial']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${title}`) })).toBeInTheDocument();
    }
  });

  it('labels each guide as to adjust, OK or without signal (text, not only color)', async () => {
    renderPage();
    await screen.findByRole('region', { name: /Aplicar neste ciclo/i });

    expect(within(screen.getByRole('button', { name: /^Molas/ })).getByText('Ajustar')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /^Câmbio/ })).getByText('OK')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /^Aerodinâmica/ })).getByText('Sem sinal na telemetria')).toBeInTheDocument();
  });

  it('opens a guide to show its summary, notes and suggestions', async () => {
    const user = userEvent.setup();
    mockApi.get.mockResolvedValue({
      data: makeRecommendation({ guides: makeGuides({ cambio: { notes: ['Dado por marcha só com transmissão de corrida.'] } }) }),
    });
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^Câmbio/ }));

    expect(await screen.findByText('Câmbio dentro do esperado.')).toBeVisible();
    expect(screen.getByText(/transmissão de corrida/)).toBeVisible();
  });

  it('with nothing to adjust, says so but still lists the guides', async () => {
    mockApi.get.mockResolvedValue({ data: makeRecommendation({ thisCycle: [], guides: makeGuides() }) });

    renderPage();

    expect(await screen.findByText(/Nenhum ajuste necessário neste ciclo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Freios/ })).toBeInTheDocument();
  });

  it('while collecting: shows progress and what is missing, no guides and no reset button', async () => {
    mockApi.get.mockResolvedValue({
      data: makeRecommendation({
        readiness: { ready: false, sessions: 7, requiredSessions: 10, samples: 4000, requiredSamples: 6000, missing: ['Faltam 3 sessões com este carro (7 de 10).', 'Faltam 2000 amostras (~2 min de pilotagem gravada).'] },
        guides: [],
        thisCycle: [],
      }),
    });

    renderPage();

    expect(await screen.findByText('Faltam 3 sessões com este carro (7 de 10).')).toBeInTheDocument();
    expect(screen.getByText(/Faltam 2000 amostras/)).toBeInTheDocument();
    expect(screen.getByText('7 de 10 sessões')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pneus/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Aplicar neste ciclo/i })).not.toBeInTheDocument();
  });

  it('explains the limits: directions only (no setup values from the game), max 3 per cycle', async () => {
    renderPage();

    expect(await screen.findByText(/não envia os valores do setup/i)).toBeInTheDocument();
    expect(screen.getByText(/no máximo 3 ajustes por ciclo/i)).toBeInTheDocument();
  });

  it('restarts the collection only after confirming, then reloads', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Reiniciar coleta/i }));

    expect(mockApi.post).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/api/v1/tuning/cars/3667/checkpoint'));
    await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(2));
  });

  it('cancelling the confirmation does nothing', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Reiniciar coleta/i }));

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(mockApi.post).not.toHaveBeenCalled();
    expect(mockApi.get).toHaveBeenCalledTimes(1);
  });

  it('tells the user when the restart fails', async () => {
    const user = userEvent.setup();
    mockApi.post.mockRejectedValue(new Error('500'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Reiniciar coleta/i }));

    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText(/Não foi possível reiniciar a coleta/i)).toBeInTheDocument();
  });

  it('shows a friendly message for a car without sessions', async () => {
    mockApi.get.mockRejectedValue({ isAxiosError: true, response: { status: 404 } });

    renderPage();

    expect(await screen.findByText(/Nenhuma sessão coletada para este carro/i)).toBeInTheDocument();
  });

  it('shows an error with retry on other failures', async () => {
    const user = userEvent.setup();
    mockApi.get.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({ data: makeRecommendation() });
    renderPage();

    expect(await screen.findByText(/Não foi possível carregar a recomendação/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Tentar novamente/i }));

    expect(await screen.findByRole('region', { name: /Aplicar neste ciclo/i })).toBeInTheDocument();
  });
});

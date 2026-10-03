import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TuningCarros from '@/pages/forza/TuningCarros';
import { makeTuningCar, renderAt } from './helpers';

const { mockApi, mockNavigate } = vi.hoisted(() => ({ mockApi: { get: vi.fn(), post: vi.fn() }, mockNavigate: vi.fn() }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));
vi.mock('react-router-dom', async () => ({ ...(await vi.importActual('react-router-dom')), useNavigate: () => mockNavigate }));

const renderPage = () => renderAt(<TuningCarros />, { path: '/forza/tuning', route: '/forza/tuning' });

describe('Forza · Tuning · carros', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the cars with name, class/PI, drivetrain and progress toward the minimum', async () => {
    mockApi.get.mockResolvedValue({ data: [makeTuningCar({ sessions: 7, ready: false, samples: 9000 })] });

    renderPage();

    expect(await screen.findByText('2021 Porsche 911 GT3')).toBeInTheDocument();
    expect(screen.getByText('S2 · PI 812')).toBeInTheDocument();
    expect(screen.getByText('RWD')).toBeInTheDocument();
    expect(screen.getByText('7 de 10 sessões')).toBeInTheDocument();
    expect(mockApi.get.mock.calls[0][0]).toBe('/api/v1/tuning/cars');
  });

  it('flags cars that already have enough data as ready, and the others as collecting', async () => {
    mockApi.get.mockResolvedValue({
      data: [makeTuningCar({ carOrdinal: 1, carName: 'Carro A', ready: true }), makeTuningCar({ carOrdinal: 2, carName: 'Carro B', ready: false, sessions: 3 })],
    });

    renderPage();
    await screen.findByText('Carro A');

    expect(screen.getByText('Pronto')).toBeInTheDocument();
    expect(screen.getByText('Coletando')).toBeInTheDocument();
  });

  it('falls back to #ordinal when the car name is unknown', async () => {
    mockApi.get.mockResolvedValue({ data: [makeTuningCar({ carOrdinal: 1234, carName: null })] });

    renderPage();

    expect(await screen.findByText('#1234')).toBeInTheDocument();
  });

  it('opens the recommendation of the clicked car', async () => {
    const user = userEvent.setup();
    mockApi.get.mockResolvedValue({ data: [makeTuningCar({ carOrdinal: 3667 })] });

    renderPage();
    await user.click(await screen.findByText('2021 Porsche 911 GT3'));

    expect(mockNavigate).toHaveBeenCalledWith('/forza/tuning/3667/S2');
  });

  it('shows the sample progress toward the required volume, next to the sessions', async () => {
    mockApi.get.mockResolvedValue({ data: [makeTuningCar({ sessions: 3, samples: 12400, ready: false })] });

    renderPage();

    expect(await screen.findByText(/12\.400 de 50\.000 amostras/)).toBeInTheDocument();
  });

  it('shows the session in progress with its samples and the target, as not counted yet', async () => {
    mockApi.get.mockResolvedValue({
      data: [makeTuningCar({ ready: false, sessions: 3, activeSession: { samples: 2340, targetSamples: 5000, startedAt: '2026-10-10T12:30:00Z' } })],
    });

    renderPage();

    expect(await screen.findByText(/Gravando agora: 2\.340 de 5\.000 amostras/)).toBeInTheDocument();
    expect(screen.getByLabelText('Sessão em andamento')).toBeInTheDocument();
    expect(screen.getByText(/entra na contagem ao fechar/i)).toBeInTheDocument();
  });

  it('shows the samples of the session in progress next to the counted total, so the number visibly moves', async () => {
    mockApi.get.mockResolvedValue({
      data: [makeTuningCar({ ready: false, sessions: 5, samples: 7980, activeSession: { samples: 3466, targetSamples: 5000, startedAt: '2026-10-10T12:30:00Z' } })],
    });

    renderPage();

    // o total conta ao vivo: 7.980 (sessões fechadas) + 3.466 (em andamento) = 11.446
    expect(await screen.findByText(/11\.446 de 50\.000 amostras/)).toBeInTheDocument();
    expect(screen.getByText(/7\.980 em sessões fechadas \+ 3\.466 em andamento/)).toBeInTheDocument();
  });

  it('keeps the plain total when there is no session in progress', async () => {
    mockApi.get.mockResolvedValue({ data: [makeTuningCar({ ready: false, sessions: 5, samples: 7980 })] });

    renderPage();

    expect(await screen.findByText('7.980 de 50.000 amostras')).toBeInTheDocument();
    expect(screen.queryByText(/em sessões fechadas/)).not.toBeInTheDocument();
  });

  it('says the recommendation only uses closed sessions, even when the live total already reaches the volume', async () => {
    mockApi.get.mockResolvedValue({
      data: [makeTuningCar({ ready: false, sessions: 9, samples: 48000, activeSession: { samples: 4000, targetSamples: 5000, startedAt: '2026-10-10T12:30:00Z' } })],
    });

    renderPage();

    expect(await screen.findByText(/52\.000 de 50\.000 amostras/)).toBeInTheDocument();
    expect(screen.getByText(/A recomendação usa só sessões fechadas/i)).toBeInTheDocument();
  });

  it('explains a race that runs past the session size: it keeps recording and only closes when the race ends', async () => {
    mockApi.get.mockResolvedValue({
      data: [makeTuningCar({ ready: false, activeSession: { samples: 6500, targetSamples: 5000, startedAt: '2026-10-10T12:30:00Z' } })],
    });

    renderPage();

    expect(await screen.findByText(/Gravando agora: 6\.500 amostras/)).toBeInTheDocument();
    expect(screen.queryByText(/6\.500 de 5\.000/)).not.toBeInTheDocument();
    expect(screen.getByText(/corrida ou evento em andamento: só fecha e passa a contar quando terminar/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Sessão em andamento')).toHaveAttribute('aria-valuenow', '100');
  });

  it('shows no recording line when no session is open', async () => {
    mockApi.get.mockResolvedValue({ data: [makeTuningCar()] });

    renderPage();
    await screen.findByText('2021 Porsche 911 GT3');

    expect(screen.queryByText(/Gravando agora/)).not.toBeInTheDocument();
  });

  it('refreshes the list every 15 seconds, without a loading spinner, so the recording progress moves', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      mockApi.get.mockResolvedValueOnce({ data: [makeTuningCar({ activeSession: { samples: 1000, targetSamples: 5000, startedAt: '2026-10-10T12:30:00Z' } })] });
      mockApi.get.mockResolvedValueOnce({ data: [makeTuningCar({ activeSession: { samples: 1600, targetSamples: 5000, startedAt: '2026-10-10T12:30:00Z' } })] });

      renderPage();
      expect(await screen.findByText(/Gravando agora: 1\.000 de 5\.000/)).toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(14_000);
      expect(mockApi.get).toHaveBeenCalledTimes(1);   // ainda não: o intervalo é de 15 s
      await vi.advanceTimersByTimeAsync(1_000);

      expect(await screen.findByText(/Gravando agora: 1\.600 de 5\.000/)).toBeInTheDocument();
      expect(screen.queryByRole('progressbar', { name: '' })).not.toBeInTheDocument();
      expect(mockApi.get).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('lists the same car once per performance class (each class is a different build)', async () => {
    const user = userEvent.setup();
    mockApi.get.mockResolvedValue({
      data: [
        makeTuningCar({ carOrdinal: 1105, carName: '1964 Aston Martin DB5 Vantage', performanceClass: 'A', performanceIndex: 700, sessions: 3 }),
        makeTuningCar({ carOrdinal: 1105, carName: '1964 Aston Martin DB5 Vantage', performanceClass: 'C', performanceIndex: 416, sessions: 5 }),
      ],
    });

    renderPage();
    await screen.findByText('A · PI 700');

    expect(screen.getByText('C · PI 416')).toBeInTheDocument();
    expect(screen.getByText('3 de 10 sessões')).toBeInTheDocument();
    expect(screen.getByText('5 de 10 sessões')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Abrir tuning de 1964 Aston Martin DB5 Vantage \(C\)/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/forza/tuning/1105/C');
  });

  it('explains how the recommendation works (minimum sessions, per car, FH6 note)', async () => {
    mockApi.get.mockResolvedValue({ data: [makeTuningCar()] });

    renderPage();
    await screen.findByText('2021 Porsche 911 GT3');

    expect(screen.getByText(/pelo menos 10 sessões/i)).toBeInTheDocument();
  });

  it('links to the history of saved tunings, with or without active cars', async () => {
    const user = userEvent.setup();
    mockApi.get.mockResolvedValue({ data: [] });

    renderPage();
    await user.click(await screen.findByRole('button', { name: /Tunings feitos/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/forza/tuning/historico');
  });

  it('shows the empty state pointing to the sessions collection', async () => {
    mockApi.get.mockResolvedValue({ data: [] });

    renderPage();

    expect(await screen.findByText(/Nenhum carro com sessões coletadas/i)).toBeInTheDocument();
  });

  it('shows an error with retry', async () => {
    const user = userEvent.setup();
    mockApi.get.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({ data: [makeTuningCar()] });

    renderPage();
    expect(await screen.findByText(/Não foi possível carregar os carros/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Tentar novamente/i }));

    expect(await screen.findByText('2021 Porsche 911 GT3')).toBeInTheDocument();
  });
});

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
    expect(screen.getByText('S1 · PI 812')).toBeInTheDocument();
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

    expect(mockNavigate).toHaveBeenCalledWith('/forza/tuning/3667');
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

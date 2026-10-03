import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TuningHistorico from '@/pages/forza/TuningHistorico';
import { makeTuningHistoryItem, renderAt } from './helpers';

const { mockApi, mockNavigate } = vi.hoisted(() => ({ mockApi: { get: vi.fn() }, mockNavigate: vi.fn() }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));
vi.mock('react-router-dom', async () => ({ ...(await vi.importActual('react-router-dom')), useNavigate: () => mockNavigate }));

const renderPage = () => renderAt(<TuningHistorico />, { path: '/forza/tuning/historico', route: '/forza/tuning/historico' });

describe('Forza · Tuning · histórico', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the saved tunings with car, class/PI, drivetrain, sessions used and number of adjustments', async () => {
    mockApi.get.mockResolvedValue({ data: [makeTuningHistoryItem()] });

    renderPage();

    expect(await screen.findByText('1964 Aston Martin DB5 Vantage')).toBeInTheDocument();
    expect(screen.getByText('A · PI 700')).toBeInTheDocument();
    expect(screen.getByText('RWD')).toBeInTheDocument();
    expect(screen.getByText('12 sessões')).toBeInTheDocument();
    expect(screen.getByText('2 ajustes')).toBeInTheDocument();
    expect(mockApi.get.mock.calls[0][0]).toBe('/api/v1/tuning/history');
  });

  it('says "nenhum ajuste" when the saved tuning had nothing to change', async () => {
    mockApi.get.mockResolvedValue({ data: [makeTuningHistoryItem({ adjustments: 0 })] });

    renderPage();

    expect(await screen.findByText('Nenhum ajuste')).toBeInTheDocument();
  });

  it('uses the singular for a single adjustment', async () => {
    mockApi.get.mockResolvedValue({ data: [makeTuningHistoryItem({ adjustments: 1 })] });

    renderPage();

    expect(await screen.findByText('1 ajuste')).toBeInTheDocument();
  });

  it('falls back to #ordinal when the car name is unknown', async () => {
    mockApi.get.mockResolvedValue({ data: [makeTuningHistoryItem({ carOrdinal: 1234, carName: null })] });

    renderPage();

    expect(await screen.findByText('#1234')).toBeInTheDocument();
  });

  it('opens the saved tuning that was clicked', async () => {
    const user = userEvent.setup();
    mockApi.get.mockResolvedValue({ data: [makeTuningHistoryItem({ id: 'abc-123' })] });

    renderPage();
    await user.click(await screen.findByText('1964 Aston Martin DB5 Vantage'));

    expect(mockNavigate).toHaveBeenCalledWith('/forza/tuning/historico/abc-123');
  });

  it('keeps the entries in the order the API sent (newest first)', async () => {
    mockApi.get.mockResolvedValue({
      data: [makeTuningHistoryItem({ id: 'novo', carName: 'Carro Novo' }), makeTuningHistoryItem({ id: 'velho', carName: 'Carro Velho' })],
    });

    renderPage();
    await screen.findByText('Carro Novo');

    const names = screen.getAllByRole('button', { name: /Abrir tuning salvo de/i }).map((b) => b.textContent);
    expect(names).toEqual(['Carro Novo', 'Carro Velho']);
  });

  it('explains how a tuning gets saved when the history is empty', async () => {
    mockApi.get.mockResolvedValue({ data: [] });

    renderPage();

    expect(await screen.findByText(/Nenhum tuning salvo ainda/i)).toBeInTheDocument();
    expect(screen.getByText(/Reiniciar coleta/i)).toBeInTheDocument();
  });

  it('shows an error with retry', async () => {
    const user = userEvent.setup();
    mockApi.get.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({ data: [makeTuningHistoryItem()] });

    renderPage();
    expect(await screen.findByText(/Não foi possível carregar o histórico/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Tentar novamente/i }));

    expect(await screen.findByText('1964 Aston Martin DB5 Vantage')).toBeInTheDocument();
  });
});

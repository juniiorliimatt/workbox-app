import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Sessoes from '@/pages/forza/Sessoes';
import { makeSession, renderAt } from './helpers';

const { mockApi, mockNavigate } = vi.hoisted(() => ({ mockApi: { get: vi.fn() }, mockNavigate: vi.fn() }));

vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));
vi.mock('react-router-dom', async () => ({ ...(await vi.importActual('react-router-dom')), useNavigate: () => mockNavigate }));

const renderPage = () => renderAt(<Sessoes />, { path: '/forza/sessoes', route: '/forza/sessoes' });

describe('Forza · Sessões', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading indicator, then the session rows', async () => {
    mockApi.get.mockResolvedValue({ data: { items: [makeSession()], nextCursor: null } });

    renderPage();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByText('#1234')).toBeInTheDocument();
    expect(screen.getByText('S1 · PI 812')).toBeInTheDocument();
    expect(screen.getByText('AWD')).toBeInTheDocument();
    expect(screen.getByText('Encerrada')).toBeInTheDocument();
    expect(screen.getByText('12.000')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows the exact car name instead of the ordinal when the service knows it', async () => {
    mockApi.get.mockResolvedValue({ data: { items: [makeSession({ carOrdinal: 3667, carName: '2021 Porsche 911 GT3' })], nextCursor: null } });

    renderPage();

    expect(await screen.findByText('2021 Porsche 911 GT3')).toBeInTheDocument();
    expect(screen.queryByText('#3667')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir sessão 2021 Porsche 911 GT3/i })).toBeInTheDocument();
  });

  it('requests the first page without cursor', async () => {
    mockApi.get.mockResolvedValue({ data: { items: [], nextCursor: null } });

    renderPage();

    await waitFor(() => expect(mockApi.get).toHaveBeenCalled());
    const [url, config] = mockApi.get.mock.calls[0];
    expect(url).toBe('/api/v1/sessions');
    expect(config.params).toEqual({ size: 20 });
  });

  it('marks a session that is still receiving packets as active', async () => {
    mockApi.get.mockResolvedValue({ data: { items: [makeSession({ active: true, endedAt: null })], nextCursor: null } });

    renderPage();

    expect(await screen.findByText('Ativa')).toBeInTheDocument();
  });

  it('shows the empty state with the Data Out hint', async () => {
    mockApi.get.mockResolvedValue({ data: { items: [], nextCursor: null } });

    renderPage();

    expect(await screen.findByText(/Nenhuma sessão registrada ainda/i)).toBeInTheDocument();
    expect(screen.getByText(/Ative o Data Out no jogo/i)).toBeInTheDocument();
    expect(await screen.findByText('5310')).toBeInTheDocument();
  });

  it('shows an error with retry, and retrying reloads the list', async () => {
    const user = userEvent.setup();
    mockApi.get.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({ data: { items: [makeSession()], nextCursor: null } });

    renderPage();

    expect(await screen.findByText(/Não foi possível carregar as sessões/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Tentar novamente/i }));

    expect(await screen.findByText('#1234')).toBeInTheDocument();
    expect(mockApi.get).toHaveBeenCalledTimes(2);
  });

  it('loads the next page with the cursor and appends the rows', async () => {
    const user = userEvent.setup();
    mockApi.get
      .mockResolvedValueOnce({ data: { items: [makeSession({ id: 'a', carOrdinal: 1 })], nextCursor: 'c2' } })
      .mockResolvedValueOnce({ data: { items: [makeSession({ id: 'b', carOrdinal: 2 })], nextCursor: null } });

    renderPage();
    await screen.findByText('#1');
    await user.click(screen.getByRole('button', { name: /Carregar mais/i }));

    expect(await screen.findByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(mockApi.get.mock.calls[1][1].params).toEqual({ size: 20, cursor: 'c2' });
    expect(screen.queryByRole('button', { name: /Carregar mais/i })).not.toBeInTheDocument();
  });

  it('hides "Carregar mais" on the last page', async () => {
    mockApi.get.mockResolvedValue({ data: { items: [makeSession()], nextCursor: null } });

    renderPage();
    await screen.findByText('#1234');

    expect(screen.queryByRole('button', { name: /Carregar mais/i })).not.toBeInTheDocument();
  });

  it('navigates to the session detail when a row is clicked', async () => {
    const user = userEvent.setup();
    mockApi.get.mockResolvedValue({ data: { items: [makeSession({ id: 'abc-123' })], nextCursor: null } });

    renderPage();
    await user.click(await screen.findByText('#1234'));

    expect(mockNavigate).toHaveBeenCalledWith('/forza/sessoes/abc-123');
  });

  it('exposes each row to keyboard users through a button', async () => {
    const user = userEvent.setup();
    mockApi.get.mockResolvedValue({ data: { items: [makeSession({ id: 'abc-123' })], nextCursor: null } });

    renderPage();
    const open = await screen.findByRole('button', { name: /Abrir sessão #1234/i });
    open.focus();
    await user.keyboard('{Enter}');

    expect(mockNavigate).toHaveBeenCalledWith('/forza/sessoes/abc-123');
  });
});

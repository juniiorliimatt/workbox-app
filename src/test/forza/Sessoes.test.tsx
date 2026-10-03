import { screen, waitFor, within } from '@testing-library/react';
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
    expect(config.params).toEqual({ size: 5 });
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

  describe('paginação (5 / 15 / 30 por página)', () => {
    const rowsOf = (...ordinals: number[]) => ordinals.map((n) => makeSession({ id: `s${n}`, carOrdinal: n }));
    const pager = () => screen.getByRole('navigation', { name: /Paginação das sessões/i });

    it('starts with 5 per page and offers 5, 15 and 30 per page', async () => {
      const user = userEvent.setup();
      mockApi.get.mockResolvedValue({ data: { items: rowsOf(1, 2, 3, 4, 5), nextCursor: 'c2' } });

      renderPage();
      await screen.findByText('#1');

      const select = within(pager()).getByRole('combobox', { name: /Por página/i });
      expect(select).toHaveTextContent('5');
      await user.click(select);
      const options = screen.getAllByRole('option').map((o) => o.textContent);
      expect(options).toEqual(['5', '15', '30']);
    });

    it('goes to the next page by the cursor and REPLACES the rows (one page at a time)', async () => {
      const user = userEvent.setup();
      mockApi.get
        .mockResolvedValueOnce({ data: { items: rowsOf(1, 2), nextCursor: 'c2' } })
        .mockResolvedValueOnce({ data: { items: rowsOf(3, 4), nextCursor: null } });

      renderPage();
      await screen.findByText('#1');
      await user.click(within(pager()).getByRole('button', { name: /Próxima página/i }));

      expect(await screen.findByText('#3')).toBeInTheDocument();
      expect(screen.queryByText('#1')).not.toBeInTheDocument();
      expect(mockApi.get.mock.calls[1][1].params).toEqual({ size: 5, cursor: 'c2' });
    });

    it('goes back to the previous page (same cursor as before) and shows its rows again', async () => {
      const user = userEvent.setup();
      mockApi.get
        .mockResolvedValueOnce({ data: { items: rowsOf(1, 2), nextCursor: 'c2' } })
        .mockResolvedValueOnce({ data: { items: rowsOf(3, 4), nextCursor: 'c3' } })
        .mockResolvedValueOnce({ data: { items: rowsOf(1, 2), nextCursor: 'c2' } });

      renderPage();
      await screen.findByText('#1');
      await user.click(within(pager()).getByRole('button', { name: /Próxima página/i }));
      await screen.findByText('#3');
      await user.click(within(pager()).getByRole('button', { name: /Página anterior/i }));

      expect(await screen.findByText('#1')).toBeInTheDocument();
      expect(screen.queryByText('#3')).not.toBeInTheDocument();
      expect(mockApi.get.mock.calls[2][1].params).toEqual({ size: 5 });
    });

    it('disables "previous" on the first page and "next" on the last one', async () => {
      const user = userEvent.setup();
      mockApi.get
        .mockResolvedValueOnce({ data: { items: rowsOf(1), nextCursor: 'c2' } })
        .mockResolvedValueOnce({ data: { items: rowsOf(2), nextCursor: null } });

      renderPage();
      await screen.findByText('#1');
      expect(within(pager()).getByRole('button', { name: /Página anterior/i })).toBeDisabled();
      expect(within(pager()).getByRole('button', { name: /Próxima página/i })).toBeEnabled();

      await user.click(within(pager()).getByRole('button', { name: /Próxima página/i }));
      await screen.findByText('#2');

      expect(within(pager()).getByRole('button', { name: /Próxima página/i })).toBeDisabled();
      expect(within(pager()).getByRole('button', { name: /Página anterior/i })).toBeEnabled();
    });

    it('changing the page size reloads from the first page with the new size', async () => {
      const user = userEvent.setup();
      mockApi.get
        .mockResolvedValueOnce({ data: { items: rowsOf(1, 2), nextCursor: 'c2' } })
        .mockResolvedValueOnce({ data: { items: rowsOf(3, 4), nextCursor: 'c3' } })
        .mockResolvedValueOnce({ data: { items: rowsOf(1, 2, 3, 4), nextCursor: null } });

      renderPage();
      await screen.findByText('#1');
      await user.click(within(pager()).getByRole('button', { name: /Próxima página/i }));
      await screen.findByText('#3');
      await user.click(within(pager()).getByRole('combobox', { name: /Por página/i }));
      await user.click(screen.getByRole('option', { name: '15' }));

      expect(await screen.findByText('#1')).toBeInTheDocument();
      expect(mockApi.get.mock.calls[2][1].params).toEqual({ size: 15 });
      expect(within(pager()).getByRole('button', { name: /Página anterior/i })).toBeDisabled();
    });

    it('offers 30 per page', async () => {
      const user = userEvent.setup();
      mockApi.get.mockResolvedValue({ data: { items: rowsOf(1), nextCursor: null } });

      renderPage();
      await screen.findByText('#1');
      await user.click(within(pager()).getByRole('combobox', { name: /Por página/i }));
      await user.click(screen.getByRole('option', { name: '30' }));

      await waitFor(() => expect(mockApi.get.mock.calls[1][1].params).toEqual({ size: 30 }));
    });

    it('shows which rows are on screen (range), counting from the first page', async () => {
      const user = userEvent.setup();
      mockApi.get
        .mockResolvedValueOnce({ data: { items: rowsOf(1, 2, 3, 4, 5), nextCursor: 'c2' } })
        .mockResolvedValueOnce({ data: { items: rowsOf(6, 7), nextCursor: null } });

      renderPage();
      await screen.findByText('#1');
      expect(within(pager()).getByText(/1–5/)).toBeInTheDocument();

      await user.click(within(pager()).getByRole('button', { name: /Próxima página/i }));
      await screen.findByText('#6');

      expect(within(pager()).getByText(/6–7 de 7/)).toBeInTheDocument();
    });

    it('keeps the current page and warns when loading another page fails', async () => {
      const user = userEvent.setup();
      mockApi.get
        .mockResolvedValueOnce({ data: { items: rowsOf(1, 2), nextCursor: 'c2' } })
        .mockRejectedValueOnce(new Error('Network Error'));

      renderPage();
      await screen.findByText('#1');
      await user.click(within(pager()).getByRole('button', { name: /Próxima página/i }));

      expect(await screen.findByText(/Falha ao carregar a página/i)).toBeInTheDocument();
      expect(screen.getByText('#1')).toBeInTheDocument();
    });

    it('locks the controls while a page is loading, so the same page is never requested twice', async () => {
      const user = userEvent.setup();
      let resolveSecond: (value: unknown) => void = () => {};
      mockApi.get
        .mockResolvedValueOnce({ data: { items: rowsOf(1), nextCursor: 'c2' } })
        .mockReturnValueOnce(new Promise((resolve) => (resolveSecond = resolve)));

      renderPage();
      await screen.findByText('#1');
      await user.click(within(pager()).getByRole('button', { name: /Próxima página/i }));

      expect(within(pager()).getByRole('button', { name: /Próxima página/i })).toBeDisabled();
      expect(within(pager()).getByRole('button', { name: /Página anterior/i })).toBeDisabled();
      expect(mockApi.get).toHaveBeenCalledTimes(2);
      resolveSecond({ data: { items: rowsOf(2), nextCursor: null } });
      expect(await screen.findByText('#2')).toBeInTheDocument();
    });
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

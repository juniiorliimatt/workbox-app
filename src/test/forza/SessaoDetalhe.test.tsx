import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SessaoDetalhe from '@/pages/forza/SessaoDetalhe';
import { makeSession, makeSummary, renderAt } from './helpers';

const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn() } }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));

const ID = '11111111-1111-1111-1111-111111111111';

const stub = (opts?: { session?: unknown; laps?: unknown; summary?: unknown; samples?: unknown }) => {
  mockApi.get.mockImplementation((url: string) => {
    if (url.endsWith('/laps')) return Promise.resolve({ data: opts?.laps ?? [{ lapNumber: 1, lapTimeS: 62.5 }, { lapNumber: 2, lapTimeS: 61.25 }] });
    if (url.endsWith('/summary')) return Promise.resolve({ data: opts?.summary ?? makeSummary() });
    if (url.endsWith('/samples')) return Promise.resolve({ data: opts?.samples ?? [] });
    return Promise.resolve({ data: opts?.session ?? makeSession({ id: ID }) });
  });
};

const renderPage = () => renderAt(<SessaoDetalhe />, { path: '/forza/sessoes/:id', route: `/forza/sessoes/${ID}` });

describe('Forza · Detalhe da sessão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads session, laps and summary and shows the header metadata', async () => {
    stub();

    renderPage();

    expect(await screen.findByRole('heading', { name: /Sessão #1234/i })).toBeInTheDocument();
    expect(screen.getByText(/S1 · PI 812/)).toBeInTheDocument();
    expect(screen.getByText(/Integral \(AWD\)/)).toBeInTheDocument();
    const urls = mockApi.get.mock.calls.map((c) => c[0]);
    expect(urls).toEqual(expect.arrayContaining([`/api/v1/sessions/${ID}`, `/api/v1/sessions/${ID}/laps`, `/api/v1/sessions/${ID}/summary`]));
  });

  it('renders the tuning summary tiles and the suspension table by default', async () => {
    stub();

    renderPage();

    expect(await screen.findByText('Velocidade máxima')).toBeInTheDocument();
    expect(screen.getByText('288,4 km/h')).toBeInTheDocument();
    expect(screen.getByText('650,5 cv')).toBeInTheDocument();
    const suspension = screen.getByRole('table', { name: /Suspensão/i });
    expect(within(suspension).getByText('2,5%')).toBeInTheDocument();
  });

  it('shows corner balance per phase, with an empty phase marked as no data', async () => {
    stub();

    renderPage();

    expect(await screen.findByText(/Equilíbrio em curva/i)).toBeInTheDocument();
    expect(screen.getByText('70,0%')).toBeInTheDocument();
    expect(screen.getByText(/Sem dados/i)).toBeInTheDocument();
  });

  it('shows tire temperatures in Celsius and the final wear when present', async () => {
    stub();

    renderPage();

    const tires = await screen.findByRole('table', { name: /Pneus/i });
    expect(within(tires).getAllByText('90,0 °C').length).toBeGreaterThan(0);
    expect(within(tires).getByText('0,123')).toBeInTheDocument();
  });

  it('explains when there are not enough samples for a summary', async () => {
    stub({ summary: { samples: 0, durationS: 0 } });

    renderPage();

    expect(await screen.findByText(/Sem amostras suficientes para gerar o resumo/i)).toBeInTheDocument();
  });

  it('copies the summary JSON to the clipboard and confirms', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const summary = makeSummary();
    stub({ summary });

    renderPage();
    await user.click(await screen.findByRole('button', { name: /Copiar resumo \(JSON\)/i }));

    expect(writeText).toHaveBeenCalledWith(JSON.stringify(summary, null, 2));
    expect(await screen.findByText(/Resumo copiado/i)).toBeInTheDocument();
  });

  it('warns when the clipboard is unavailable', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('negado'));
    stub();

    renderPage();
    await user.click(await screen.findByRole('button', { name: /Copiar resumo \(JSON\)/i }));

    expect(await screen.findByText(/Não foi possível copiar/i)).toBeInTheDocument();
  });

  it('flags an active session and says the summary is computed live', async () => {
    stub({ session: makeSession({ id: ID, active: true, endedAt: null }) });

    renderPage();

    expect(await screen.findByText('Ativa')).toBeInTheDocument();
    expect(screen.getByText(/resumo é calculado na hora/i)).toBeInTheDocument();
  });

  it('lists laps with formatted times and highlights the best one', async () => {
    const user = userEvent.setup();
    stub();

    renderPage();
    await user.click(await screen.findByRole('tab', { name: /Voltas/i }));

    const slower = screen.getByText('1:02.500').closest('tr') as HTMLElement;
    const fastest = screen.getByText('1:01.250').closest('tr') as HTMLElement;
    expect(within(fastest).getByText(/Melhor volta/i)).toBeInTheDocument();
    expect(within(slower).queryByText(/Melhor volta/i)).not.toBeInTheDocument();
    expect(within(slower).getByText('+1,250 s')).toBeInTheDocument();
  });

  it('shows an empty state when no lap was completed', async () => {
    const user = userEvent.setup();
    stub({ laps: [] });

    renderPage();
    await user.click(await screen.findByRole('tab', { name: /Voltas/i }));

    expect(screen.getByText(/Nenhuma volta concluída/i)).toBeInTheDocument();
  });

  it('only fetches samples once the telemetry tab is opened', async () => {
    const user = userEvent.setup();
    stub();

    renderPage();
    await screen.findByRole('heading', { name: /Sessão #1234/i });
    expect(mockApi.get.mock.calls.some((c) => String(c[0]).endsWith('/samples'))).toBe(false);

    await user.click(screen.getByRole('tab', { name: /Telemetria/i }));

    await waitFor(() => expect(mockApi.get.mock.calls.some((c) => String(c[0]).endsWith('/samples'))).toBe(true));
    const call = mockApi.get.mock.calls.find((c) => String(c[0]).endsWith('/samples'));
    expect(call?.[1].params).toEqual({ limit: 10000 });
  });

  it('says so when the telemetry window was truncated by the limit', async () => {
    const user = userEvent.setup();
    const samples = Array.from({ length: 10000 }, (_, i) => ({ tMs: i * 50, speed: 20, rpm: 4000, accel: 0, brake: 0, gear: 3 }));
    stub({ samples });

    renderPage();
    await user.click(await screen.findByRole('tab', { name: /Telemetria/i }));

    expect(await screen.findByText(/Mostrando as primeiras 10\.000 amostras/i)).toBeInTheDocument();
  });

  it('shows a friendly message when the session does not exist', async () => {
    mockApi.get.mockRejectedValue({ isAxiosError: true, response: { status: 404 } });

    renderPage();

    expect(await screen.findByText(/Sessão não encontrada/i)).toBeInTheDocument();
  });

  it('shows a generic error with retry on other failures', async () => {
    mockApi.get.mockRejectedValue(new Error('Network Error'));

    renderPage();

    expect(await screen.findByText(/Não foi possível carregar a sessão/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument();
  });
});

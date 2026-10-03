import { act, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AoVivo from '@/pages/forza/AoVivo';
import { LiveSnapshotDTO } from '@/interfaces/forza';
import { renderAt } from './helpers';

const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn() } }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));

const snapshot = (overrides?: Partial<LiveSnapshotDTO>): LiveSnapshotDTO => ({
  receivedAt: '2026-10-03T12:00:00Z',
  gameFormat: 'FH4/FH5/FH6',
  raceOn: true,
  carOrdinal: 1234,
  performanceIndex: 812,
  rpm: 5000,
  engineMaxRpm: 8000,
  speedKmh: 72,
  gear: 4,
  accel: 255,
  brake: 0,
  steer: -10,
  suspension: [0.5, 0.5, 0.5, 0.5],
  slipAngle: [0, 0, 0, 0],
  combinedSlip: [0, 0, 0, 0],
  tireTempF: [194, 194, 176, 176],
  lapNumber: 2,
  currentLapS: 15.5,
  lastLapS: 62.5,
  bestLapS: 61.25,
  ...overrides,
});

const notFound = { isAxiosError: true, response: { status: 404 } };

const renderPage = () => renderAt(<AoVivo />, { path: '/forza/ao-vivo', route: '/forza/ao-vivo' });
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

describe('Forza · Ao vivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches immediately and shows speed, gear, rpm and pedals', async () => {
    mockApi.get.mockResolvedValue({ data: snapshot() });

    renderPage();

    expect(await screen.findByText('72 km/h')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/5\.000 \/ 8\.000 rpm/)).toBeInTheDocument();
    expect(screen.getByText('Acelerador 100%')).toBeInTheDocument();
    expect(screen.getByText('Freio 0%')).toBeInTheDocument();
    expect(screen.getByText('Ao vivo')).toBeInTheDocument();
    expect(mockApi.get.mock.calls[0][0]).toBe('/api/v1/live/snapshot');
  });

  it('shows tire temperatures in Celsius and lap times', async () => {
    mockApi.get.mockResolvedValue({ data: snapshot() });

    renderPage();

    expect(await screen.findAllByText('90,0 °C')).not.toHaveLength(0);
    expect(screen.getByText('1:02.500')).toBeInTheDocument();
    expect(screen.getByText('1:01.250')).toBeInTheDocument();
    expect(screen.getByText('0:15.500')).toBeInTheDocument();
  });

  it('shows a waiting state (not an error) when there is no recent packet', async () => {
    mockApi.get.mockRejectedValue(notFound);

    renderPage();

    expect(await screen.findByText(/Aguardando telemetria do jogo/i)).toBeInTheDocument();
    expect(screen.queryByText(/Falha ao consultar/i)).not.toBeInTheDocument();
  });

  it('shows the machine IP and port to point the game at while waiting', async () => {
    mockApi.get.mockImplementation((url: string) =>
      url === '/api/v1/live/info' ? Promise.resolve({ data: { hostAddresses: ['192.168.100.36'], udpPort: 5310 } }) : Promise.reject(notFound),
    );

    renderPage();

    expect(await screen.findByText('192.168.100.36')).toBeInTheDocument();
    expect(screen.getByText(/Nenhum pacote chegou nos últimos 5 segundos/)).toBeInTheDocument();
  });

  it('polls every second', async () => {
    mockApi.get.mockResolvedValue({ data: snapshot() });

    renderPage();
    await screen.findByText('72 km/h');
    const before = mockApi.get.mock.calls.length;
    await tick(1000);
    await tick(1000);

    expect(mockApi.get.mock.calls.length).toBe(before + 2);
  });

  it('updates the screen with the newest snapshot', async () => {
    mockApi.get.mockResolvedValueOnce({ data: snapshot({ speedKmh: 72 }) }).mockResolvedValue({ data: snapshot({ speedKmh: 130 }) });

    renderPage();
    await screen.findByText('72 km/h');
    await tick(1000);

    expect(await screen.findByText('130 km/h')).toBeInTheDocument();
  });

  it('stops polling after unmount', async () => {
    mockApi.get.mockResolvedValue({ data: snapshot() });

    const { unmount } = renderPage();
    await screen.findByText('72 km/h');
    unmount();
    const after = mockApi.get.mock.calls.length;
    await tick(5000);

    expect(mockApi.get.mock.calls.length).toBe(after);
  });

  it('cancels the in-flight request on unmount', async () => {
    let received: AbortSignal | undefined;
    mockApi.get.mockImplementation((_url: string, config?: { signal?: AbortSignal }) => {
      received = config?.signal;
      return new Promise(() => undefined);
    });

    const { unmount } = renderPage();
    await tick(0);
    unmount();

    expect(received?.aborted).toBe(true);
  });

  it('shows an error alert on server failures and recovers on the next poll', async () => {
    mockApi.get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } }).mockResolvedValue({ data: snapshot() });

    renderPage();
    expect(await screen.findByText(/Falha ao consultar a telemetria/i)).toBeInTheDocument();
    await tick(1000);

    expect(await screen.findByText('72 km/h')).toBeInTheDocument();
    expect(screen.queryByText(/Falha ao consultar a telemetria/i)).not.toBeInTheDocument();
  });

  it('marks the stream as paused when the game is not in a race', async () => {
    mockApi.get.mockResolvedValue({ data: snapshot({ raceOn: false }) });

    renderPage();

    expect(await screen.findByText('Pausado')).toBeInTheDocument();
  });

  it('explains the Sled format has no dash data', async () => {
    mockApi.get.mockResolvedValue({ data: snapshot({ gameFormat: 'Sled', speedKmh: null, gear: null, accel: null, brake: null, steer: null, tireTempF: null, lapNumber: null }) });

    renderPage();

    expect(await screen.findByText(/Formato Sled: sem dados de Dash/i)).toBeInTheDocument();
  });
});

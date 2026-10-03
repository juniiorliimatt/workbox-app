import { describe, it, expect, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { getLiveInfo, getTuningHistoryEntry, getTuningRecommendation, listTuningCars, listTuningHistory, resetTuningCollection, getLiveSnapshot, getSession, getSessionLaps, getSessionSamples, getSessionSummary, listSessions } from '@/services/forzaApi';

const makeApi = (data: unknown = {}) => ({ get: vi.fn().mockResolvedValue({ data }) }) as unknown as AxiosInstance & { get: ReturnType<typeof vi.fn> };

describe('forzaApi', () => {
  it('listSessions sends cursor and size and unwraps the body', async () => {
    const api = makeApi({ items: [], nextCursor: null });
    const signal = new AbortController().signal;

    const page = await listSessions(api, { cursor: 'abc', size: 30 }, signal);

    expect(api.get).toHaveBeenCalledWith('/api/v1/sessions', { params: { cursor: 'abc', size: 30 }, signal });
    expect(page).toEqual({ items: [], nextCursor: null });
  });

  it('listSessions omits an absent cursor', async () => {
    const api = makeApi({ items: [] });

    await listSessions(api, { size: 20 });

    expect(api.get).toHaveBeenCalledWith('/api/v1/sessions', { params: { size: 20 }, signal: undefined });
  });

  it('getSession, getSessionLaps and getSessionSummary hit the session sub-resources', async () => {
    const api = makeApi({ ok: true });

    await getSession(api, 'abc');
    await getSessionLaps(api, 'abc');
    await getSessionSummary(api, 'abc');

    expect(api.get.mock.calls.map((c) => c[0])).toEqual([
      '/api/v1/sessions/abc',
      '/api/v1/sessions/abc/laps',
      '/api/v1/sessions/abc/summary',
    ]);
  });

  it('getSessionSamples forwards the window and limit', async () => {
    const api = makeApi([]);

    await getSessionSamples(api, 'abc', { fromMs: 1000, toMs: 5000, limit: 300 });

    expect(api.get).toHaveBeenCalledWith('/api/v1/sessions/abc/samples', {
      params: { fromMs: 1000, toMs: 5000, limit: 300 },
      signal: undefined,
    });
  });

  it('getLiveSnapshot returns null when the service answers 404 (no recent packet)', async () => {
    const api = { get: vi.fn().mockRejectedValue({ isAxiosError: true, response: { status: 404 } }) } as unknown as AxiosInstance;

    await expect(getLiveSnapshot(api)).resolves.toBeNull();
  });

  it('getLiveSnapshot rethrows other failures', async () => {
    const error = { isAxiosError: true, response: { status: 500 } };
    const api = { get: vi.fn().mockRejectedValue(error) } as unknown as AxiosInstance;

    await expect(getLiveSnapshot(api)).rejects.toBe(error);
  });

  it('getLiveSnapshot returns the body on success', async () => {
    const api = makeApi({ rpm: 5000 });

    await expect(getLiveSnapshot(api)).resolves.toEqual({ rpm: 5000 });
    expect(api.get).toHaveBeenCalledWith('/api/v1/live/snapshot', { signal: undefined });
  });

  it('getLiveInfo reads the announced Data Out address', async () => {
    const api = makeApi({ hostAddresses: ['192.168.0.10'], udpPort: 5310 });

    await expect(getLiveInfo(api)).resolves.toEqual({ hostAddresses: ['192.168.0.10'], udpPort: 5310 });
    expect(api.get).toHaveBeenCalledWith('/api/v1/live/info', { signal: undefined });
  });

  it('listTuningCars and getTuningRecommendation hit the tuning resources', async () => {
    const api = makeApi([]);

    await listTuningCars(api);
    await getTuningRecommendation(api, 3667);

    expect(api.get.mock.calls.map((c) => c[0])).toEqual(['/api/v1/tuning/cars', '/api/v1/tuning/cars/3667']);
  });

  it('listTuningHistory and getTuningHistoryEntry hit the history resources', async () => {
    const api = makeApi([]);

    await listTuningHistory(api);
    await getTuningHistoryEntry(api, 'abc-123');

    expect(api.get.mock.calls.map((c) => c[0])).toEqual(['/api/v1/tuning/history', '/api/v1/tuning/history/abc-123']);
  });

  it('resetTuningCollection posts to the checkpoint of the car', async () => {
    const post = vi.fn().mockResolvedValue({ status: 204 });
    const api = { post } as unknown as AxiosInstance;

    await resetTuningCollection(api, 3667);

    expect(post).toHaveBeenCalledWith('/api/v1/tuning/cars/3667/checkpoint');
  });
});

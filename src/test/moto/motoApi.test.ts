import { describe, expect, it, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import {
  createMotorcycle,
  createOdometerReading,
  createOilChange,
  createRefueling,
  deleteMotorcycle,
  deleteOilChange,
  deleteRefueling,
  getMonthlyStats,
  getOilStatus,
  getStats,
  getYearlyStats,
  listMotorcycles,
  listOilChanges,
  listOilIntervals,
  listRefuelings,
  updateMotorcycle,
  updateOilChange,
  updateRefueling,
} from '@/services/motoApi';

const makeApi = (data: unknown = {}) =>
  ({
    get: vi.fn().mockResolvedValue({ data }),
    post: vi.fn().mockResolvedValue({ data }),
    put: vi.fn().mockResolvedValue({ data }),
    delete: vi.fn().mockResolvedValue({ data: undefined }),
  }) as unknown as AxiosInstance & Record<'get' | 'post' | 'put' | 'delete', ReturnType<typeof vi.fn>>;

const MOTO = 'moto-1';
const BASE = `/api/v1/motorcycles/${MOTO}`;

describe('motoApi', () => {
  it('listMotorcycles desembrulha o corpo', async () => {
    const api = makeApi([{ id: MOTO }]);
    const signal = new AbortController().signal;

    expect(await listMotorcycles(api, signal)).toEqual([{ id: MOTO }]);
    expect(api.get).toHaveBeenCalledWith('/api/v1/motorcycles', { signal });
  });

  it('CRUD de motos usa as rotas e os verbos do contrato', async () => {
    const api = makeApi({ id: MOTO });
    const body = { nickname: 'Fazer', model: 'Fazer 250', initialOdometerKm: 1000 };

    await createMotorcycle(api, body);
    await updateMotorcycle(api, MOTO, body);
    await deleteMotorcycle(api, MOTO);

    expect(api.post).toHaveBeenCalledWith('/api/v1/motorcycles', body);
    expect(api.put).toHaveBeenCalledWith(`/api/v1/motorcycles/${MOTO}`, body);
    expect(api.delete).toHaveBeenCalledWith(`/api/v1/motorcycles/${MOTO}`);
  });

  it('listRefuelings manda período e página e omite o que não foi informado', async () => {
    const api = makeApi({ content: [], page: {} });

    await listRefuelings(api, MOTO, { from: '2026-02-01', to: '2026-02-28', page: 0, size: 10 });
    await listRefuelings(api, MOTO, { page: 2 });

    expect(api.get).toHaveBeenNthCalledWith(1, `${BASE}/refuelings`, {
      params: { from: '2026-02-01', to: '2026-02-28', page: 0, size: 10 },
      signal: undefined,
    });
    expect(api.get).toHaveBeenNthCalledWith(2, `${BASE}/refuelings`, { params: { page: 2 }, signal: undefined });
  });

  it('CRUD de abastecimentos', async () => {
    const api = makeApi({});
    const body = { date: '2026-02-10', odometerKm: 1500, liters: 5, totalValue: 32, fuelType: 'ETANOL' as const };

    await createRefueling(api, MOTO, body);
    await updateRefueling(api, MOTO, 'r1', body);
    await deleteRefueling(api, MOTO, 'r1');

    expect(api.post).toHaveBeenCalledWith(`${BASE}/refuelings`, body);
    expect(api.put).toHaveBeenCalledWith(`${BASE}/refuelings/r1`, body);
    expect(api.delete).toHaveBeenCalledWith(`${BASE}/refuelings/r1`);
  });

  it('trocas de óleo, status e intervalos padrão', async () => {
    const api = makeApi({});
    const body = { date: '2026-06-01', odometerKm: 20000, oilType: 'MINERAL' as const, intervalKm: 1500, intervalMonths: 6 };

    await listOilChanges(api, MOTO);
    await createOilChange(api, MOTO, body);
    await updateOilChange(api, MOTO, 'o1', body);
    await deleteOilChange(api, MOTO, 'o1');
    await getOilStatus(api, MOTO);
    await listOilIntervals(api);

    expect(api.get.mock.calls.map((c) => c[0])).toEqual([`${BASE}/oil-changes`, `${BASE}/oil-status`, '/api/v1/oil-intervals']);
    expect(api.post).toHaveBeenCalledWith(`${BASE}/oil-changes`, body);
    expect(api.put).toHaveBeenCalledWith(`${BASE}/oil-changes/o1`, body);
    expect(api.delete).toHaveBeenCalledWith(`${BASE}/oil-changes/o1`);
  });

  it('métricas: resumo com período, série mensal por ano e série anual', async () => {
    const api = makeApi({});

    await getStats(api, MOTO, { from: '2026-01-01', to: '2026-01-31' });
    await getStats(api, MOTO, {});
    await getMonthlyStats(api, MOTO, 2026);
    await getYearlyStats(api, MOTO);

    expect(api.get).toHaveBeenNthCalledWith(1, `${BASE}/stats`, { params: { from: '2026-01-01', to: '2026-01-31' }, signal: undefined });
    expect(api.get).toHaveBeenNthCalledWith(2, `${BASE}/stats`, { params: {}, signal: undefined });
    expect(api.get).toHaveBeenNthCalledWith(3, `${BASE}/stats/monthly`, { params: { year: 2026 }, signal: undefined });
    expect(api.get).toHaveBeenNthCalledWith(4, `${BASE}/stats/yearly`, { signal: undefined });
  });

  it('createOdometerReading registra km avulso', async () => {
    const api = makeApi({});

    await createOdometerReading(api, MOTO, { date: '2026-03-10', odometerKm: 1850 });

    expect(api.post).toHaveBeenCalledWith(`${BASE}/odometer-readings`, { date: '2026-03-10', odometerKm: 1850 });
  });
});

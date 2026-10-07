import { AxiosInstance } from 'axios';
import {
  IMonthlyStats,
  IMotorcycle,
  IMotorcycleRequest,
  IOdometerReadingRequest,
  IOilChange,
  IOilChangeRequest,
  IOilInterval,
  IOilStatus,
  IRefueling,
  IRefuelingPage,
  IRefuelingRequest,
  IStats,
  IYearlyStats,
} from '@/interfaces/moto';

/**
 * Cliente do moto-service. Contrato: moto-service/openapi/openapi.yaml.
 * Funções puras sobre uma instância Axios (a de `useAxiosWithAuth`, com Bearer e refresh).
 */

const BASE = '/api/v1/motorcycles';

export interface ListRefuelingsParams {
  /** Datas inclusivas, `YYYY-MM-DD`. */
  from?: string;
  to?: string;
  /** Página (base 0) e tamanho (a API limita a 100). */
  page?: number;
  size?: number;
}

export interface StatsParams {
  from?: string;
  to?: string;
}

/** Parâmetros de query sem as chaves não informadas. */
const compact = <T extends object>(params: T): Partial<T> =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)) as Partial<T>;

// Motos
export const listMotorcycles = async (api: AxiosInstance, signal?: AbortSignal): Promise<IMotorcycle[]> =>
  (await api.get<IMotorcycle[]>(BASE, { signal })).data;

export const createMotorcycle = async (api: AxiosInstance, body: IMotorcycleRequest): Promise<IMotorcycle> =>
  (await api.post<IMotorcycle>(BASE, body)).data;

export const updateMotorcycle = async (api: AxiosInstance, id: string, body: IMotorcycleRequest): Promise<IMotorcycle> =>
  (await api.put<IMotorcycle>(`${BASE}/${id}`, body)).data;

export const deleteMotorcycle = async (api: AxiosInstance, id: string): Promise<void> => {
  await api.delete(`${BASE}/${id}`);
};

// Abastecimentos
export const listRefuelings = async (
  api: AxiosInstance,
  motoId: string,
  params: ListRefuelingsParams,
  signal?: AbortSignal,
): Promise<IRefuelingPage> =>
  (await api.get<IRefuelingPage>(`${BASE}/${motoId}/refuelings`, { params: compact(params), signal })).data;

export const createRefueling = async (api: AxiosInstance, motoId: string, body: IRefuelingRequest): Promise<IRefueling> =>
  (await api.post<IRefueling>(`${BASE}/${motoId}/refuelings`, body)).data;

export const updateRefueling = async (api: AxiosInstance, motoId: string, id: string, body: IRefuelingRequest): Promise<IRefueling> =>
  (await api.put<IRefueling>(`${BASE}/${motoId}/refuelings/${id}`, body)).data;

export const deleteRefueling = async (api: AxiosInstance, motoId: string, id: string): Promise<void> => {
  await api.delete(`${BASE}/${motoId}/refuelings/${id}`);
};

// Troca de óleo
export const listOilChanges = async (api: AxiosInstance, motoId: string, signal?: AbortSignal): Promise<IOilChange[]> =>
  (await api.get<IOilChange[]>(`${BASE}/${motoId}/oil-changes`, { signal })).data;

export const createOilChange = async (api: AxiosInstance, motoId: string, body: IOilChangeRequest): Promise<IOilChange> =>
  (await api.post<IOilChange>(`${BASE}/${motoId}/oil-changes`, body)).data;

export const updateOilChange = async (api: AxiosInstance, motoId: string, id: string, body: IOilChangeRequest): Promise<IOilChange> =>
  (await api.put<IOilChange>(`${BASE}/${motoId}/oil-changes/${id}`, body)).data;

export const deleteOilChange = async (api: AxiosInstance, motoId: string, id: string): Promise<void> => {
  await api.delete(`${BASE}/${motoId}/oil-changes/${id}`);
};

export const getOilStatus = async (api: AxiosInstance, motoId: string, signal?: AbortSignal): Promise<IOilStatus> =>
  (await api.get<IOilStatus>(`${BASE}/${motoId}/oil-status`, { signal })).data;

export const listOilIntervals = async (api: AxiosInstance, signal?: AbortSignal): Promise<IOilInterval[]> =>
  (await api.get<IOilInterval[]>('/api/v1/oil-intervals', { signal })).data;

// Km avulso (sem abastecer)
export const createOdometerReading = async (api: AxiosInstance, motoId: string, body: IOdometerReadingRequest): Promise<void> => {
  await api.post(`${BASE}/${motoId}/odometer-readings`, body);
};

// Métricas
export const getStats = async (api: AxiosInstance, motoId: string, params: StatsParams, signal?: AbortSignal): Promise<IStats> =>
  (await api.get<IStats>(`${BASE}/${motoId}/stats`, { params: compact(params), signal })).data;

export const getMonthlyStats = async (api: AxiosInstance, motoId: string, year: number, signal?: AbortSignal): Promise<IMonthlyStats[]> =>
  (await api.get<IMonthlyStats[]>(`${BASE}/${motoId}/stats/monthly`, { params: { year }, signal })).data;

export const getYearlyStats = async (api: AxiosInstance, motoId: string, signal?: AbortSignal): Promise<IYearlyStats[]> =>
  (await api.get<IYearlyStats[]>(`${BASE}/${motoId}/stats/yearly`, { signal })).data;

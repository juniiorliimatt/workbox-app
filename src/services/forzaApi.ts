import axios, { AxiosInstance } from 'axios';
import { LapDTO, LiveSnapshotDTO, SampleDTO, SessionDTO, SessionPageDTO, TuningSummary } from '@/interfaces/forza';

/**
 * Cliente do forza-telemetry-service. Contrato: forza-telemetry-service/openapi/openapi.yaml.
 * Funções puras sobre uma instância Axios (a de `useAxiosWithAuth`, com Bearer e refresh).
 */

export interface ListSessionsParams {
  cursor?: string;
  size?: number;
}

export interface SamplesParams {
  fromMs?: number;
  toMs?: number;
  limit?: number;
}

export const listSessions = async (api: AxiosInstance, params: ListSessionsParams, signal?: AbortSignal): Promise<SessionPageDTO> =>
  (await api.get<SessionPageDTO>('/api/v1/sessions', { params, signal })).data;

export const getSession = async (api: AxiosInstance, id: string, signal?: AbortSignal): Promise<SessionDTO> =>
  (await api.get<SessionDTO>(`/api/v1/sessions/${id}`, { signal })).data;

export const getSessionLaps = async (api: AxiosInstance, id: string, signal?: AbortSignal): Promise<LapDTO[]> =>
  (await api.get<LapDTO[]>(`/api/v1/sessions/${id}/laps`, { signal })).data;

export const getSessionSummary = async (api: AxiosInstance, id: string, signal?: AbortSignal): Promise<TuningSummary> =>
  (await api.get<TuningSummary>(`/api/v1/sessions/${id}/summary`, { signal })).data;

export const getSessionSamples = async (
  api: AxiosInstance,
  id: string,
  params: SamplesParams,
  signal?: AbortSignal,
): Promise<SampleDTO[]> => (await api.get<SampleDTO[]>(`/api/v1/sessions/${id}/samples`, { params, signal })).data;

/** `null` quando o serviço responde 404 (nenhum pacote recente) — situação esperada, não erro. */
export const getLiveSnapshot = async (api: AxiosInstance, signal?: AbortSignal): Promise<LiveSnapshotDTO | null> => {
  try {
    return (await api.get<LiveSnapshotDTO>('/api/v1/live/snapshot', { signal })).data;
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
};

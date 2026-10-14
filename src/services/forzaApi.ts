import axios, { AxiosInstance } from 'axios';
import {
  CarSetupDTO,
  CarSetupRequest,
  LapDTO,
  LiveInfoDTO,
  LiveSnapshotDTO,
  SampleDTO,
  SessionDTO,
  SessionPageDTO,
  TuningCarDTO,
  TuningHistoryDTO,
  TuningHistoryItemDTO,
  TuningRecommendationDTO,
  TuningSummary,
} from '@/interfaces/forza';

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

export const getLiveInfo = async (api: AxiosInstance, signal?: AbortSignal): Promise<LiveInfoDTO> =>
  (await api.get<LiveInfoDTO>('/api/v1/live/info', { signal })).data;

export const listTuningCars = async (api: AxiosInstance, signal?: AbortSignal): Promise<TuningCarDTO[]> =>
  (await api.get<TuningCarDTO[]>('/api/v1/tuning/cars', { signal })).data;

export const getTuningRecommendation = async (
  api: AxiosInstance,
  carOrdinal: number,
  performanceClass: string,
  signal?: AbortSignal,
): Promise<TuningRecommendationDTO> => (await api.get<TuningRecommendationDTO>(`/api/v1/tuning/cars/${carOrdinal}/${performanceClass}`, { signal })).data;

/** Tunings já feitos, do mais recente para o mais antigo. */
export const listTuningHistory = async (api: AxiosInstance, signal?: AbortSignal): Promise<TuningHistoryItemDTO[]> =>
  (await api.get<TuningHistoryItemDTO[]>('/api/v1/tuning/history', { signal })).data;

export const getTuningHistoryEntry = async (api: AxiosInstance, id: string, signal?: AbortSignal): Promise<TuningHistoryDTO> =>
  (await api.get<TuningHistoryDTO>(`/api/v1/tuning/history/${id}`, { signal })).data;

/** O setup aceito do carro ou, se ainda não houver, o rascunho com a receita inicial (`confirmed = false`); sempre com os limites de cada campo. */
export const getCarSetup = async (api: AxiosInstance, carOrdinal: number, performanceClass: string, signal?: AbortSignal): Promise<CarSetupDTO> =>
  (await api.get<CarSetupDTO>(`/api/v1/tuning/cars/${carOrdinal}/${performanceClass}/setup`, { signal })).data;

/** Valida, salva e aceita o setup (422 com `errors` se fora dos limites). Mudar qualquer valor reinicia a coleta. */
export const saveCarSetup = async (api: AxiosInstance, carOrdinal: number, performanceClass: string, request: CarSetupRequest): Promise<CarSetupDTO> =>
  (await api.put<CarSetupDTO>(`/api/v1/tuning/cars/${carOrdinal}/${performanceClass}/setup`, request)).data;

/** "Apliquei": grava os alvos do ciclo como valores atuais e reinicia a coleta. */
export const applyCarSetup = async (api: AxiosInstance, carOrdinal: number, performanceClass: string): Promise<CarSetupDTO> =>
  (await api.post<CarSetupDTO>(`/api/v1/tuning/cars/${carOrdinal}/${performanceClass}/setup/apply`)).data;

/** Apaga o setup: o carro volta ao rascunho e a coleta para até aceitar de novo. */
export const deleteCarSetup = async (api: AxiosInstance, carOrdinal: number, performanceClass: string): Promise<void> => {
  await api.delete(`/api/v1/tuning/cars/${carOrdinal}/${performanceClass}/setup`);
};

/** Reinicia a coleta do carro nessa classe de PI (só sessões novas passam a contar). Com recomendação pronta, o backend a salva no histórico. */
export const resetTuningCollection = async (api: AxiosInstance, carOrdinal: number, performanceClass: string): Promise<void> => {
  await api.post(`/api/v1/tuning/cars/${carOrdinal}/${performanceClass}/checkpoint`);
};

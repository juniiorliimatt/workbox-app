import { useEffect, useState } from 'react';
import axios, { AxiosInstance } from 'axios';
import { LiveSnapshotDTO } from '@/interfaces/forza';
import { getLiveSnapshot } from '@/services/forzaApi';

/**
 * 5 Hz: o shift light precisa de leitura frequente (1 Hz perderia o ponto de troca). O jogo manda ~60
 * pacotes/s e o serviço só devolve o último — consultas locais e leves; não empilha requisições.
 */
export const LIVE_POLL_MS = 200;

/** `loading` só antes da 1ª resposta; `waiting` = serviço sem pacote recente (404); `error` = falha real. */
export type LiveStatus = 'loading' | 'ready' | 'waiting' | 'error';

export interface ILiveSnapshotState {
  snapshot: LiveSnapshotDTO | null;
  status: LiveStatus;
}

/**
 * Consulta `/api/v1/live/snapshot` a cada `intervalMs`. Não empilha requisições (pula o tick
 * se a anterior ainda não respondeu), pausa com a aba oculta e aborta a chamada em curso ao
 * desmontar. O último snapshot válido é mantido durante falhas pontuais.
 */
export const useLiveSnapshot = (api: AxiosInstance, intervalMs: number = LIVE_POLL_MS): ILiveSnapshotState => {
  const [state, setState] = useState<ILiveSnapshotState>({ snapshot: null, status: 'loading' });

  useEffect(() => {
    let active = true;
    let inFlight = false;
    const controller = new AbortController();

    const poll = async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const snapshot = await getLiveSnapshot(api, controller.signal);
        if (!active) return;
        setState(snapshot ? { snapshot, status: 'ready' } : { snapshot: null, status: 'waiting' });
      } catch (e) {
        if (!active || axios.isCancel(e)) return;
        setState((previous) => ({ ...previous, status: 'error' }));
      } finally {
        inFlight = false;
      }
    };

    void poll(); // erros são tratados dentro do próprio poll
    const timer = setInterval(poll, intervalMs);

    return () => {
      active = false;
      clearInterval(timer);
      controller.abort();
    };
  }, [api, intervalMs]);

  return state;
};

export default useLiveSnapshot;

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { IMotorcycle } from '@/interfaces/moto';
import { listMotorcycles } from '@/services/motoApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';

const STORAGE_KEY = 'workbox.moto.selecionada';

// localStorage pode lançar (janela privada, dados bloqueados): a escolha da moto é conveniência, nunca requisito.
const readStoredId = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const storeId = (id: string): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // sem persistência: a seleção vale só nesta sessão da tela
  }
};

export interface UseMotos {
  motos: IMotorcycle[];
  /** Moto em foco: a escolhida (se ainda existir), senão a primeira ativa, senão a primeira. `null` sem motos. */
  selected: IMotorcycle | null;
  select: (id: string) => void;
  /** Recarrega a lista (depois de cadastrar, editar ou excluir). */
  reload: () => Promise<void>;
  loading: boolean;
  error: boolean;
}

/** Lista as motos do usuário e guarda qual está selecionada (lembrada entre visitas). */
export const useMotos = (): UseMotos => {
  const api = useAxiosWithAuth();
  const [motos, setMotos] = useState<IMotorcycle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(readStoredId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(false);
      try {
        setMotos(await listMotorcycles(api, signal));
      } catch (e) {
        if (axios.isCancel(e) || signal?.aborted) return;
        setError(true);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [reload]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    storeId(id);
  }, []);

  const selected = useMemo(
    () => motos.find((m) => m.id === selectedId) ?? motos.find((m) => m.active) ?? motos[0] ?? null,
    [motos, selectedId],
  );

  return { motos, selected, select, reload: () => reload(), loading, error };
};

export default useMotos;

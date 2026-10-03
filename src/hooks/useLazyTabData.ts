import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export interface ILazyTabState<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

/**
 * Dados de uma aba, carregados só quando ela está ativa.
 *
 * - `active=false`: nada é buscado; dados já carregados ficam em cache pela chave.
 * - Reativar a aba com a mesma `key` reaproveita o cache (sem nova chamada).
 * - Chave diferente (ex.: filtro mudou): a aba ativa recarrega na hora; uma aba oculta só
 *   recarrega quando for exibida de novo.
 * - A requisição em curso é abortada ao trocar de chave ou desmontar, e o resultado de uma
 *   requisição superada é ignorado. Falha chama `onError` (aborto não conta) e a aba tenta de
 *   novo na próxima ativação.
 */
export const useLazyTabData = <T,>(
  active: boolean,
  key: string,
  loader: (signal: AbortSignal) => Promise<T>,
  onError?: () => void,
): ILazyTabState<T> => {
  const [state, setState] = useState<ILazyTabState<T> & { loadedKey: string | null }>({ data: null, loading: false, error: false, loadedKey: null });
  const loaderRef = useRef(loader);
  const onErrorRef = useRef(onError);
  loaderRef.current = loader;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!active || state.loadedKey === key) return undefined;

    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: false }));
    loaderRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: false, loadedKey: key });
      })
      .catch((e) => {
        if (controller.signal.aborted || axios.isCancel(e)) return;
        setState({ data: null, loading: false, error: true, loadedKey: null });
        onErrorRef.current?.();
      });
    return () => controller.abort();
  }, [active, key, state.loadedKey]);

  return { data: state.loadedKey === key ? state.data : null, loading: state.loading, error: state.error };
};

export default useLazyTabData;

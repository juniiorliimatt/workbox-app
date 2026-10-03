import { FC, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import axios from 'axios';
import { LiveInfoDTO } from '@/interfaces/forza';
import { getLiveInfo } from '@/services/forzaApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { resolveDataOutHosts } from '@/utils/forza';

const DEFAULT_UDP_PORT = 5310;

const Mono: FC<{ children: string }> = ({ children }) => (
  <Box component="code" sx={{ fontFamily: 'monospace', fontWeight: 600, px: 0.5, borderRadius: 0.5, bgcolor: 'action.hover' }}>
    {children}
  </Box>
);

export interface IDataOutHintProps {
  /** Host usado pelo navegador pra abrir o app (fallback quando o serviço não anuncia IP). */
  browserHostname?: string;
}

/**
 * "Ative o Data Out no jogo apontando para o IP X, porta P." — com o IP da máquina anunciado
 * pelo serviço (`/live/info`), ou o host do navegador, ou uma frase genérica se nenhum dos
 * dois servir. Falha ao consultar o serviço nunca quebra a tela.
 */
const DataOutHint: FC<IDataOutHintProps> = ({ browserHostname = window.location.hostname }) => {
  const api = useAxiosWithAuth();
  const [info, setInfo] = useState<LiveInfoDTO | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getLiveInfo(api, controller.signal)
      .then(setInfo)
      .catch((e) => {
        if (!axios.isCancel(e)) setInfo(null);
      });
    return () => controller.abort();
  }, [api]);

  const hosts = resolveDataOutHosts(info, browserHostname);
  const port = typeof info?.udpPort === 'number' ? info.udpPort : DEFAULT_UDP_PORT;

  return (
    <>
      Ative o Data Out no jogo apontando para{' '}
      {hosts.length === 0 && 'o IP deste PC'}
      {hosts.length === 1 && (
        <>
          o IP <Mono>{hosts[0]}</Mono>
        </>
      )}
      {hosts.length > 1 && (
        <>
          um destes IPs:{' '}
          {hosts.map((host, index) => (
            <span key={host}>
              {index > 0 && ', '}
              <Mono>{host}</Mono>
            </span>
          ))}
        </>
      )}
      , porta <Mono>{String(port)}</Mono>.
    </>
  );
};

export default DataOutHint;

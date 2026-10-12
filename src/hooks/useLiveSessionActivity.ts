import { useEffect } from 'react';
import { LiveStatus } from '@/hooks/useLiveSnapshot';
import { reportSessionActivity } from '@/utils/sessionActivity';

/** Bem abaixo do limite de inatividade (15 min): um minuto sem reporte já não deixa a sessão expirar. */
export const LIVE_ACTIVITY_REPORT_MS = 60 * 1000;

/**
 * Enquanto a telemetria está chegando (`ready`), conta como atividade da sessão: quem joga no Xbox e só acompanha a tela
 * não toca no teclado/mouse do navegador e seria deslogado por inatividade. Sem dados novos (jogo parado, falha de rede)
 * não reporta nada — aí a inatividade volta a valer e a sessão expira normalmente.
 */
export const useLiveSessionActivity = (status: LiveStatus): void => {
  useEffect(() => {
    if (status !== 'ready') return undefined;
    reportSessionActivity();
    const timer = setInterval(reportSessionActivity, LIVE_ACTIVITY_REPORT_MS);
    return () => clearInterval(timer);
  }, [status]);
};

export default useLiveSessionActivity;

/**
 * Evento de "o usuário está ativo" para telas que acompanham algo sem receber teclado/mouse (ex.: telemetria do Forza
 * chegando enquanto o jogador usa o controle do Xbox). O `IdleMonitor` o trata como atividade e adia o logout por inatividade.
 */
export const SESSION_ACTIVITY_EVENT = 'workbox:session-activity';

export const reportSessionActivity = (): void => {
  window.dispatchEvent(new Event(SESSION_ACTIVITY_EVENT));
};

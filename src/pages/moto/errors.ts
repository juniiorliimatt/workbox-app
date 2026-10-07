import axios from 'axios';

/**
 * Motivo devolvido pela API no corpo `application/problem+json` (RFC 9457, campo `detail`) — é onde o
 * moto-service explica, por exemplo, que o hodômetro quebra a ordem cronológica da moto. `undefined` quando a
 * falha não veio da API (rede, timeout) ou veio sem detalhe: aí a tela usa a mensagem padrão dela.
 */
export const apiErrorDetail = (e: unknown): string | undefined => {
  if (!axios.isAxiosError(e)) return undefined;
  const detail = (e.response?.data as { detail?: unknown } | undefined)?.detail;
  return typeof detail === 'string' && detail.length > 0 ? detail : undefined;
};

/** Texto de snackbar de erro: "Erro: <motivo da API>" ou a mensagem padrão da tela. */
export const errorMessage = (e: unknown, fallback: string): string => {
  const detail = apiErrorDetail(e);
  return detail ? `Erro: ${detail}` : fallback;
};

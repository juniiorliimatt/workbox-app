/**
 * Motivo devolvido pela API no corpo `application/problem+json` (RFC 9457, campo `detail`) — o padrão de erro de todos
 * os serviços. É onde o backend explica o que houve (ex.: "Hodômetro (1400 km) menor que o registro de ..."). `undefined`
 * quando a falha não veio da API (rede, timeout) ou veio sem detalhe.
 */
export function getProblemDetail(e: unknown): string | undefined {
  if (e && typeof e === 'object') {
    const detail = (e as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (typeof detail === 'string' && detail.length > 0) return detail;
  }
  return undefined;
}

/**
 * Extrai a mensagem de erro de uma resposta de API (axios) ou de um Error genérico. Ordem: `detail` do problem+json
 * (RFC 9457) → `message` do corpo (ex.: erro do BasicErrorController do Spring) → mensagem do próprio erro.
 */
export function getErrorMessage(e: unknown): string | undefined {
  if (e && typeof e === 'object') {
    const detail = getProblemDetail(e);
    if (detail) return detail;
    const withResponse = e as { response?: { data?: { message?: string } }; message?: string };
    return withResponse.response?.data?.message ?? withResponse.message;
  }
  return undefined;
}

import { getProblemDetail } from '@/utils/errors';

/**
 * Texto de snackbar de erro: "Erro: <motivo da API>" (campo `detail` do problem+json) ou a mensagem padrão da tela
 * quando a falha não veio da API ou veio sem detalhe (rede, 500). Não usa `getErrorMessage` direto porque, sem `detail`,
 * ele devolveria o texto técnico do axios ("Request failed with status code 500"), que não serve ao usuário.
 */
export const errorMessage = (e: unknown, fallback: string): string => {
  const detail = getProblemDetail(e);
  return detail ? `Erro: ${detail}` : fallback;
};

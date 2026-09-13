/** Extrai a mensagem de erro de uma resposta de API (axios) ou de um Error genérico. */
export function getErrorMessage(e: unknown): string | undefined {
  if (e && typeof e === 'object') {
    const withResponse = e as { response?: { data?: { message?: string } }; message?: string };
    return withResponse.response?.data?.message ?? withResponse.message;
  }
  return undefined;
}

import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { IAuthResponse } from '@/interfaces/IAuthResponse';
import { IUser } from '@/interfaces/IUser';

vi.mock('@/services/api');

const ACCESS_LIFETIME_MS = 15 * 60 * 1000;

const ok = <T,>(data: T): AxiosResponse<T> => ({ data, status: 200, statusText: 'OK', headers: {}, config: { headers: {} } as InternalAxiosRequestConfig });

/** JWT sem assinatura real: o front só lê o `exp` do payload. */
const jwt = (expiresInMs: number) => {
  const payload = btoa(JSON.stringify({ exp: Math.floor((Date.now() + expiresInMs) / 1000) })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${payload}.signature`;
};

const profile = ok<IUser>({ id: '1', socialName: 'Admin', email: 'admin@workbox.local', enabled: true });
/** O corpo traz só o access token: o refresh token vai no cookie HttpOnly, invisível ao JS. */
const tokens = (access: string) => ok<IAuthResponse>({ access_token: access });

const httpError = (status: number) =>
  new AxiosError('falhou', String(status), undefined, undefined, { status, data: {}, statusText: '', headers: {}, config: { headers: {} } as InternalAxiosRequestConfig });

const Consumer = () => {
  const { accessToken, isAuthenticated, isLoading, login, refresh } = useAuth();
  if (isLoading) return <div>Carregando...</div>;
  return (
    <div>
      <div data-testid="status">{isAuthenticated ? 'Autenticado' : 'Não autenticado'}</div>
      <div data-testid="token">{accessToken ?? 'sem token'}</div>
      <button onClick={() => void login('admin@workbox.local', 'senha')}>login</button>
      <button onClick={() => void refresh()}>refresh</button>
    </div>
  );
};

const renderLoggedOutThenLogin = async (access: string) => {
  // no mount o app tenta renovar pelo cookie; sem sessão o servidor responde 401
  vi.mocked(api.post).mockRejectedValueOnce(httpError(401));
  vi.mocked(api.get).mockResolvedValue(profile);
  render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  );
  await screen.findByText('Não autenticado');
  vi.mocked(api.post).mockResolvedValueOnce(tokens(access));
  await act(async () => screen.getByRole('button', { name: 'login' }).click());
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('Autenticado'));
};

describe('AuthProvider · renovação do access token', () => {
  beforeEach(() => {
    // mockReset (não só clear): respostas "Once" que sobraram de um teste não podem vazar para o seguinte
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('renova a sessão iniciada na tela de login (a 1ª tentativa recusada, sem sessão, não pode travar as seguintes)', async () => {
    await renderLoggedOutThenLogin(jwt(ACCESS_LIFETIME_MS));
    vi.mocked(api.post).mockResolvedValueOnce(tokens('novo-access'));

    await act(async () => screen.getByRole('button', { name: 'refresh' }).click());

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/auth/refresh'));
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('novo-access'));
  });

  it('renova sozinho, 2 minutos antes de o access token expirar, sem nenhuma requisição falhar antes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const first = jwt(ACCESS_LIFETIME_MS);
    await renderLoggedOutThenLogin(first);
    const renewed = jwt(2 * ACCESS_LIFETIME_MS);
    vi.mocked(api.post).mockResolvedValueOnce(tokens(renewed));

    await act(async () => vi.advanceTimersByTimeAsync(ACCESS_LIFETIME_MS - 121_000));
    expect(api.post).toHaveBeenCalledTimes(2); // refresh do mount (recusado) + login: ainda não é hora

    await act(async () => vi.advanceTimersByTimeAsync(2_000));

    expect(api.post).toHaveBeenCalledTimes(3);
    expect(api.post).toHaveBeenLastCalledWith('/api/v1/auth/refresh');
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent(renewed));
    expect(screen.getByTestId('status')).toHaveTextContent('Autenticado');
  });

  it('agenda a renovação seguinte a partir do token novo (a sessão não cai no 2º ciclo)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderLoggedOutThenLogin(jwt(ACCESS_LIFETIME_MS));
    // o JWT é gerado na hora da chamada: um token renovado vale 15 min a partir de AGORA
    vi.mocked(api.post)
      .mockImplementationOnce(async () => tokens(jwt(ACCESS_LIFETIME_MS)))
      .mockImplementationOnce(async () => tokens(jwt(ACCESS_LIFETIME_MS)));

    await act(async () => vi.advanceTimersByTimeAsync(ACCESS_LIFETIME_MS - 119_000));
    await act(async () => vi.advanceTimersByTimeAsync(ACCESS_LIFETIME_MS));

    expect(api.post).toHaveBeenCalledWith('/api/v1/auth/refresh');
    expect(api.post).toHaveBeenCalledWith('/api/v1/auth/refresh');
    expect(screen.getByTestId('status')).toHaveTextContent('Autenticado');
  });

  it('refresh simultâneos viram uma única chamada ao backend (o refresh token roda a cada uso)', async () => {
    await renderLoggedOutThenLogin(jwt(ACCESS_LIFETIME_MS));
    vi.mocked(api.post).mockResolvedValueOnce(tokens('novo-access'));

    await act(async () => {
      screen.getByRole('button', { name: 'refresh' }).click();
      screen.getByRole('button', { name: 'refresh' }).click();
    });

    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('novo-access'));
    expect(vi.mocked(api.post).mock.calls.filter(([url]) => url === '/api/v1/auth/refresh')).toHaveLength(2); // a do mount (sem sessão) + uma só pelos dois cliques
  });

  it.each([
    ['queda de rede', new Error('Network Error')],
    ['erro 503 do servidor', httpError(503)],
    ['limite de requisições (429)', httpError(429)],
  ])('falha transitória (%s) NÃO derruba a sessão', async (_name, failure) => {
    await renderLoggedOutThenLogin(jwt(ACCESS_LIFETIME_MS));
    vi.mocked(api.post).mockRejectedValueOnce(failure);

    await act(async () => screen.getByRole('button', { name: 'refresh' }).click());

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/auth/refresh'));
    expect(screen.getByTestId('status')).toHaveTextContent('Autenticado');
  });

  it('refresh token recusado pelo servidor (401) encerra a sessão', async () => {
    await renderLoggedOutThenLogin(jwt(ACCESS_LIFETIME_MS));
    vi.mocked(api.post).mockRejectedValueOnce(httpError(401));

    await act(async () => screen.getByRole('button', { name: 'refresh' }).click());

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('Não autenticado'));
  });

  it('depois de uma falha transitória, tenta renovar de novo em vez de esperar o token expirar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderLoggedOutThenLogin(jwt(ACCESS_LIFETIME_MS));
    vi.mocked(api.post)
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockImplementationOnce(async () => tokens(jwt(ACCESS_LIFETIME_MS)));

    await act(async () => vi.advanceTimersByTimeAsync(ACCESS_LIFETIME_MS - 119_000)); // 1ª tentativa falha
    await act(async () => vi.advanceTimersByTimeAsync(20_000)); // nova tentativa em poucos segundos

    expect(api.post).toHaveBeenLastCalledWith('/api/v1/auth/refresh');
    expect(vi.mocked(api.post).mock.calls.filter(([url]) => url === '/api/v1/auth/refresh')).toHaveLength(3); // mount + tentativa que falhou + nova tentativa
  });
});

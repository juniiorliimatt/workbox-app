import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { IAuthResponse } from '@/interfaces/IAuthResponse';
import { IUser } from '@/interfaces/IUser';

vi.mock('@/services/api');

const mockAxiosResponse = <T,>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} } as InternalAxiosRequestConfig,
});

const TestConsumer = () => {
  const { user, accessToken, isAuthenticated, isAdmin, isLoading, login, logout, registerUser } = useAuth();

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Autenticado' : 'Não autenticado'}</div>
      <div data-testid="is-admin">{isAdmin ? 'Admin' : 'Regular'}</div>
      <div data-testid="user-name">{user?.socialName || 'Anônimo'}</div>
      <div data-testid="token">{accessToken || 'Sem token'}</div>
      <button onClick={() => login('admin@workbox.local', 'admin')}>Fazer Login</button>
      <button onClick={() => logout()}>Fazer Logout</button>
      <button
        onClick={() =>
          registerUser({ socialName: 'Novo Usuário', email: 'new@test.com', password: 'password123' })
        }
      >
        Registrar
      </button>
    </div>
  );
};

describe('AuthContext & AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('ao montar, renova a sessão pelo cookie HttpOnly (sem corpo e sem guardar nada no localStorage)', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(
      mockAxiosResponse<IAuthResponse>({ access_token: 'initial-jwt-token' })
    );

    vi.mocked(api.get).mockResolvedValueOnce(
      mockAxiosResponse<IUser>({ id: '1', socialName: 'Administrador', email: 'admin@workbox.local', enabled: true })
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/v1/auth/refresh');
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado');
      expect(screen.getByTestId('user-name')).toHaveTextContent('Administrador');
      expect(screen.getByTestId('token')).toHaveTextContent('initial-jwt-token');
    });
    expect(Object.keys(localStorage)).toEqual([]);
  });

  it('migra uma única vez o refresh token salvo no localStorage antes do cookie e apaga a chave', async () => {
    localStorage.setItem('workbox_refresh_token', 'token-legado');
    vi.mocked(api.post).mockResolvedValueOnce(mockAxiosResponse<IAuthResponse>({ access_token: 'jwt-migrado' }));
    vi.mocked(api.get).mockResolvedValueOnce(
      mockAxiosResponse<IUser>({ id: '1', socialName: 'Administrador', email: 'admin@workbox.local', enabled: true })
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('jwt-migrado'));
    expect(api.post).toHaveBeenCalledWith('/api/v1/auth/refresh', { refreshToken: 'token-legado' });
    expect(localStorage.getItem('workbox_refresh_token')).toBeNull();
  });

  it('a chave legada é apagada mesmo se o servidor recusar o token antigo', async () => {
    localStorage.setItem('workbox_refresh_token', 'token-legado-vencido');
    vi.mocked(api.post).mockRejectedValueOnce(
      new AxiosError('401', '401', undefined, undefined, { status: 401, data: {}, statusText: '', headers: {}, config: { headers: {} } as InternalAxiosRequestConfig })
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('Não autenticado'));
    expect(localStorage.getItem('workbox_refresh_token')).toBeNull();
  });

  it('calls register endpoint on registerUser', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Não autenticado');
    });

    vi.mocked(api.post).mockResolvedValueOnce(
      mockAxiosResponse<IUser>({ id: '1', socialName: 'Novo Usuário', email: 'new@test.com', enabled: true })
    );

    const registerBtn = screen.getByRole('button', { name: /Registrar/i });
    await user.click(registerBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/v1/auth/register', {
        socialName: 'Novo Usuário',
        email: 'new@test.com',
        password: 'password123',
      });
    });
  });

  it('performs login successfully and fetches user profile', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Não autenticado');
    });

    // login succeeds
    vi.mocked(api.post).mockResolvedValueOnce(
      mockAxiosResponse<IAuthResponse>({ access_token: 'new-jwt-token' })
    );

    vi.mocked(api.get).mockResolvedValueOnce(
      mockAxiosResponse<IUser>({
        id: '2',
        socialName: 'Administrador',
        email: 'admin@workbox.local',
        enabled: true,
      })
    );

    const loginBtn = screen.getByRole('button', { name: /Fazer Login/i });
    await user.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado');
      expect(screen.getByTestId('user-name')).toHaveTextContent('Administrador');
      expect(screen.getByTestId('token')).toHaveTextContent('new-jwt-token');
    });
    expect(Object.keys(localStorage)).toEqual([]);
  });

  it('performs logout and clears state and stored tokens', async () => {
    const user = userEvent.setup();

    vi.mocked(api.post).mockResolvedValueOnce(mockAxiosResponse<IAuthResponse>({ access_token: 'jwt-to-logout' }));

    vi.mocked(api.get).mockResolvedValueOnce(
      mockAxiosResponse<IUser>({ id: '1', socialName: 'Administrador', email: 'admin@workbox.local', enabled: true })
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado');
    });

    vi.mocked(api.post).mockResolvedValueOnce(mockAxiosResponse({}));

    const logoutBtn = screen.getByRole('button', { name: /Fazer Logout/i });
    await user.click(logoutBtn);

    await waitFor(() => {
      // o servidor apaga o cookie do refresh token na resposta do logout
      expect(api.post).toHaveBeenCalledWith('/api/v1/auth/logout', {}, { headers: { Authorization: 'Bearer jwt-to-logout' } });
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Não autenticado');
      expect(screen.getByTestId('user-name')).toHaveTextContent('Anônimo');
      expect(screen.getByTestId('token')).toHaveTextContent('Sem token');
    });
  });

  it('garante que refresh é single-flight (apenas uma requisição concorrente à API)', async () => {
    let apiResolve: (value: unknown) => void = () => undefined;
    const pendingPromise = new Promise((resolve) => {
      apiResolve = resolve;
    });

    // Mock do api.post para o /api/v1/auth/refresh
    vi.mocked(api.post).mockReturnValueOnce(pendingPromise as unknown as ReturnType<typeof api.post>);

    let capturedRefresh: (() => Promise<string | null>) | undefined;
    const TestSingleFlight = () => {
      const { refresh } = useAuth();
      capturedRefresh = refresh;
      return null;
    };

    render(
      <AuthProvider>
        <TestSingleFlight />
      </AuthProvider>
    );

    // O primeiro refresh roda no mount do AuthProvider (no useEffect)
    // Esperamos um pouco para pegar a função e também garantir que o mount foi concluído.
    await waitFor(() => {
      expect(capturedRefresh).toBeDefined();
    });

    // Dispara N requisições de refresh manuais (simulando múltiplas requisições 401 do interceptor)
    const p1 = capturedRefresh!();
    const p2 = capturedRefresh!();
    const p3 = capturedRefresh!();

    // Resolve a API com um novo par de tokens
    apiResolve(mockAxiosResponse<IAuthResponse>({ access_token: 'new-single-flight-token' }));

    const results = await Promise.all([p1, p2, p3]);

    // Todas as promises de refresh devem retornar o mesmo token
    expect(results[0]).toBe('new-single-flight-token');
    expect(results[1]).toBe('new-single-flight-token');
    expect(results[2]).toBe('new-single-flight-token');

    // A chamada para /api/v1/auth/refresh só deve ter acontecido UMA vez.
    // (Lembrando que na montagem do AuthProvider o refresh é chamado uma vez)
    const refreshCalls = vi.mocked(api.post).mock.calls.filter(c => c[0] === '/api/v1/auth/refresh');
    expect(refreshCalls.length).toBe(1);
  });

});

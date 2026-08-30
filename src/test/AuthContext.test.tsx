import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
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
  const { user, accessToken, isAuthenticated, isLoading, login, logout, registerUser } = useAuth();

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Autenticado' : 'Não autenticado'}</div>
      <div data-testid="user-name">{user?.username || 'Anônimo'}</div>
      <div data-testid="token">{accessToken || 'Sem token'}</div>
      <button onClick={() => login('admin', 'admin')}>Fazer Login</button>
      <button onClick={() => logout()}>Fazer Logout</button>
      <button onClick={() => registerUser('new_user', 'new@test.com', 'password123')}>Registrar</button>
    </div>
  );
};

describe('AuthContext & AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes and attempts token refresh on mount', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(
      mockAxiosResponse<IAuthResponse>({ access_token: 'initial-jwt-token' })
    );

    vi.mocked(api.get).mockResolvedValueOnce(
      mockAxiosResponse<IUser>({ id: '1', username: 'admin', email: null, enabled: true })
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado');
      expect(screen.getByTestId('user-name')).toHaveTextContent('admin');
      expect(screen.getByTestId('token')).toHaveTextContent('initial-jwt-token');
    });
  });

  it('calls register endpoint on registerUser', async () => {
    const user = userEvent.setup();

    vi.mocked(api.post).mockRejectedValueOnce(new Error('No token'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Não autenticado');
    });

    vi.mocked(api.post).mockResolvedValueOnce(mockAxiosResponse({}));

    const registerBtn = screen.getByRole('button', { name: /Registrar/i });
    await user.click(registerBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/v1/auth/register', {
        username: 'new_user',
        email: 'new@test.com',
        password: 'password123',
      });
    });
  });

  it('performs login successfully and fetches user profile', async () => {
    const user = userEvent.setup();

    // initial refresh fails
    vi.mocked(api.post).mockRejectedValueOnce(new Error('No token'));

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
        username: 'admin',
        email: 'admin@workbox.local',
        enabled: true,
      })
    );

    const loginBtn = screen.getByRole('button', { name: /Fazer Login/i });
    await user.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado');
      expect(screen.getByTestId('user-name')).toHaveTextContent('admin');
      expect(screen.getByTestId('token')).toHaveTextContent('new-jwt-token');
    });
  });

  it('performs logout and clears state', async () => {
    const user = userEvent.setup();

    vi.mocked(api.post).mockResolvedValueOnce(
      mockAxiosResponse<IAuthResponse>({ access_token: 'jwt-to-logout' })
    );

    vi.mocked(api.get).mockResolvedValueOnce(
      mockAxiosResponse<IUser>({ id: '1', username: 'admin', email: null, enabled: true })
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
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Não autenticado');
      expect(screen.getByTestId('user-name')).toHaveTextContent('Anônimo');
      expect(screen.getByTestId('token')).toHaveTextContent('Sem token');
    });
  });
});

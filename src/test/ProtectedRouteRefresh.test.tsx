import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { FC, useEffect, useState } from 'react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/contexts/AuthContextValue';
import { IAuthContext } from '@/interfaces/IAuthContext';
import ProtectedRoute from '@/routes/ProtectedRoute';
import api from '@/services/api';

const authValue = (overrides?: Partial<IAuthContext>): IAuthContext => ({
  accessToken: 'old',
  user: null,
  isAuthenticated: true,
  isAdmin: true,
  isLoading: false,
  mfaRequired: false,
  mfaToken: null,
  login: vi.fn(),
  loginMfa: vi.fn(),
  registerUser: vi.fn(),
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
  changePassword: vi.fn(),
  enrollMfa: vi.fn(),
  verifyMfa: vi.fn(),
  disableMfa: vi.fn(),
  refresh: vi.fn().mockResolvedValue('new'),
  logout: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

/** Tela no estilo das de Administração: usa `api` direto e monta o header à mão, sem `useAxiosWithAuth`. */
const ManualHeaderScreen: FC = () => {
  const [result, setResult] = useState('carregando');
  useEffect(() => {
    api
      .get('/api/v1/role', { headers: { Authorization: 'Bearer old' } })
      .then(() => setResult('carregou'))
      .catch(() => setResult('falhou'));
  }, []);
  return <div>{result}</div>;
};

describe('ProtectedRoute · renovação em 401 vale para toda tela autenticada', () => {
  const originalAdapter = api.defaults.adapter;
  const sentTokens: string[] = [];

  beforeEach(() => {
    sentTokens.length = 0;
    const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
      const token = String(config.headers.Authorization);
      sentTokens.push(token);
      const response = { data: {}, status: token === 'Bearer old' ? 401 : 200, statusText: '', headers: {}, config };
      if (response.status === 401) throw new AxiosError('expirado', '401', config, undefined, response);
      return response;
    };
    api.defaults.adapter = adapter;
  });
  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it('um 401 numa tela que monta o header à mão (como o Admin) dispara o refresh e repete a chamada com o token novo', async () => {
    const auth = authValue();

    // O ProtectedRoute já está montado (e com o interceptor instalado) quando o usuário navega até a tela de Administração.
    render(
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Link to="/admin/papeis">ir para papéis</Link>} />
              <Route path="/admin/papeis" element={<ManualHeaderScreen />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    await userEvent.click(screen.getByRole('link', { name: 'ir para papéis' }));

    expect(await screen.findByText('carregou')).toBeInTheDocument();
    expect(auth.refresh).toHaveBeenCalledTimes(1);
    expect(sentTokens).toEqual(['Bearer old', 'Bearer new']);
  });
});

import { render } from '@testing-library/react';
import { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { FC } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/contexts/AuthContextValue';
import { IAuthContext } from '@/interfaces/IAuthContext';
import api from '@/services/api';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';

/** Como o AuthProvider real: funções novas a cada render do contexto. */
const authValue = (accessToken: string): IAuthContext => ({
  accessToken,
  user: null,
  isAuthenticated: true,
  isAdmin: false,
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
  refresh: vi.fn().mockResolvedValue(null),
  logout: vi.fn().mockResolvedValue(undefined),
});

const Consumer: FC = () => {
  useAxiosWithAuth();
  return null;
};

const tree = (token: string, consumers = 1) => (
  <AuthContext.Provider value={authValue(token)}>
    {Array.from({ length: consumers }, (_, i) => (
      <Consumer key={i} />
    ))}
  </AuthContext.Provider>
);

describe('useAxiosWithAuth · interceptors', () => {
  const originalAdapter = api.defaults.adapter;
  const sentTokens: string[] = [];

  beforeEach(() => {
    sentTokens.length = 0;
    const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
      sentTokens.push(String(config.headers.Authorization));
      return { data: {}, status: 200, statusText: '', headers: {}, config };
    };
    api.defaults.adapter = adapter;
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('re-render do contexto (funções novas, mesmo token) não reinstala os interceptors', () => {
    const use = vi.spyOn(api.interceptors.request, 'use');
    const eject = vi.spyOn(api.interceptors.request, 'eject');
    const view = render(tree('t1'));

    view.rerender(tree('t1'));
    view.rerender(tree('t1'));

    expect(use).toHaveBeenCalledTimes(1);
    expect(eject).not.toHaveBeenCalled();
    view.unmount();
  });

  it('várias telas usando o hook instalam um único par de interceptors', () => {
    const useRequest = vi.spyOn(api.interceptors.request, 'use');
    const useResponse = vi.spyOn(api.interceptors.response, 'use');

    const view = render(tree('t1', 3));

    expect(useRequest).toHaveBeenCalledTimes(1);
    expect(useResponse).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('a requisição sai com o access token mais recente, sem reinstalar ao trocar de token', async () => {
    const use = vi.spyOn(api.interceptors.request, 'use');
    const view = render(tree('t1'));

    view.rerender(tree('t2'));
    await api.get('/api/v1/qualquer');

    expect(sentTokens).toEqual(['Bearer t2']);
    expect(use).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('remove os interceptors quando a última tela que usa o hook sai', async () => {
    const eject = vi.spyOn(api.interceptors.request, 'eject');
    const view = render(tree('t1', 2));

    view.rerender(tree('t1', 1));
    expect(eject).not.toHaveBeenCalled();

    view.unmount();
    expect(eject).toHaveBeenCalledTimes(1);
    await api.get('/api/v1/qualquer');
    expect(sentTokens).toEqual(['undefined']);
  });
});

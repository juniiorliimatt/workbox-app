import { useLayoutEffect } from 'react';
import { InternalAxiosRequestConfig } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { IAuthContext } from '@/interfaces/IAuthContext';
import api from '@/services/api';

type AuthHandlers = Pick<IAuthContext, 'accessToken' | 'refresh' | 'logout'>;

/**
 * Um único par de interceptors para o app inteiro, que lê o estado de auth atual por referência. Antes, cada tela que
 * chamava o hook instalava o seu par (ficavam vários ao mesmo tempo) e todos eram removidos e reinstalados a cada render
 * do AuthProvider, porque `refresh`/`logout` mudam de identidade a cada render.
 */
let latest: AuthHandlers = { accessToken: null, refresh: async () => null, logout: async () => undefined };
let users = 0;
let installed: { request: number; response: number } | null = null;

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const install = (): void => {
  const request = api.interceptors.request.use(
    (config) => {
      if (latest.accessToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${latest.accessToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  const response = api.interceptors.response.use(
    (res) => res,
    async (error) => {
      const prevRequest: RetriableConfig | undefined = error?.config;

      // Evita loop caso a requisição com 401 seja o próprio endpoint de auth/refresh/login
      const isAuthEndpoint =
        prevRequest?.url?.includes('/api/v1/auth/refresh') || prevRequest?.url?.includes('/api/v1/auth/login');

      if (prevRequest && error?.response?.status === 401 && !prevRequest._retry && !isAuthEndpoint) {
        prevRequest._retry = true;
        try {
          const newAccessToken = await latest.refresh();
          if (newAccessToken) {
            prevRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(prevRequest);
          }
        } catch {
          await latest.logout();
        }
      }
      return Promise.reject(error);
    },
  );

  installed = { request, response };
};

const uninstall = (): void => {
  if (!installed) return;
  api.interceptors.request.eject(installed.request);
  api.interceptors.response.eject(installed.response);
  installed = null;
};

export const useAxiosWithAuth = () => {
  const { accessToken, refresh, logout } = useAuth();

  // Layout effects rodam antes dos efeitos comuns da árvore: o token já está atualizado quando uma tela dispara a
  // requisição no seu `useEffect`.
  useLayoutEffect(() => {
    latest = { accessToken, refresh, logout };
  });

  useLayoutEffect(() => {
    users += 1;
    if (users === 1) install();
    return () => {
      users -= 1;
      if (users === 0) uninstall();
    };
  }, []);

  return api;
};

export default useAxiosWithAuth;

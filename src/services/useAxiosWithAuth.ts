import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';

export const useAxiosWithAuth = () => {
  const { accessToken, refresh, logout } = useAuth();

  useEffect(() => {
    const requestIntercept = api.interceptors.request.use(
      (config) => {
        if (accessToken && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseIntercept = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const prevRequest = error?.config;

        // Evita loop caso a requisição com 401 seja o próprio endpoint de auth/refresh/login
        const isAuthEndpoint =
          prevRequest?.url?.includes('/api/v1/auth/refresh') ||
          prevRequest?.url?.includes('/api/v1/auth/login');

        if (error?.response?.status === 401 && !prevRequest?._retry && !isAuthEndpoint) {
          prevRequest._retry = true;
          try {
            const newAccessToken = await refresh();
            if (newAccessToken) {
              prevRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return api(prevRequest);
            }
          } catch {
            await logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestIntercept);
      api.interceptors.response.eject(responseIntercept);
    };
  }, [accessToken, refresh, logout]);

  return api;
};

export default useAxiosWithAuth;

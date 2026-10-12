import {
  FC,
  useCallback,
  useEffect,
  useState,
  useRef,
} from 'react';
import axios from 'axios';
import { IAuthProviderProps } from '@/interfaces/IAuthProviderProps';
import { IAuthResponse } from '@/interfaces/IAuthResponse';
import { IUser } from '@/interfaces/IUser';
import { IUserApiRegisterDTO } from '@/interfaces/IUserApiRegisterDTO';
import { IMfaEnrollResponse } from '@/interfaces/IMfaEnrollResponse';
import api from '@/services/api';
import { AuthContext } from './AuthContextValue';

const REFRESH_TOKEN_STORAGE_KEY = 'workbox_refresh_token';

/** Antecedência da renovação (o token vale 15 min). Folga larga: aba em segundo plano tem os timers atrasados pelo browser. */
const RENEW_MARGIN_MS = 2 * 60 * 1000;
/** Piso do agendamento: evita um laço de renovações se o servidor devolver um token que já nasce vencido. */
const MIN_RENEW_DELAY_MS = 10 * 1000;
/** Nova tentativa depois de uma falha transitória (rede, 5xx, 429). */
const RENEW_RETRY_MS = 15 * 1000;

/** Quando o access token expira (ms desde a época), lido do `exp` do payload; `null` se não der pra ler. */
const readTokenExpiryMs = (token: string): number | null => {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;
    const exp = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
};

/** O servidor respondeu e recusou o refresh token (inválido, expirado ou revogado): a sessão acabou de verdade. */
const isRefreshRejected = (error: unknown): boolean => {
  if (!axios.isAxiosError(error) || !error.response) return false;
  const { status } = error.response;
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
};

const extractRolesFromToken = (token: string): string[] => {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return [];
    const decoded = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
    if (Array.isArray(decoded.roles)) {
      return decoded.roles;
    }
    return [];
  } catch {
    return [];
  }
};

export const AuthProvider: FC<IAuthProviderProps> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [, setRefreshTokenState] = useState<string | null>(() => {
    return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  });
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mfaRequired, setMfaRequired] = useState<boolean>(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const fetchUserProfile = useCallback(async (token: string): Promise<IUser | null> => {
    try {
      const response = await api.get<IUser>('/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const roles = extractRolesFromToken(token);
      const userProfile: IUser = {
        ...response.data,
        roles,
      };
      setUser(userProfile);
      return userProfile;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const response = await api.post<IAuthResponse>('/api/v1/auth/login', {
      email,
      password,
    });

    const isMfa = response.data.mfa_required || response.data.mfaRequired;
    const tokenMfa = response.data.mfa_token || response.data.mfaToken;

    if (isMfa && tokenMfa) {
      setMfaRequired(true);
      setMfaToken(tokenMfa);
      setAccessToken(null);
      setUser(null);
      return;
    }

    const token = response.data.access_token || response.data.accessToken;
    const refreshToken = response.data.refresh_token || response.data.refreshToken;

    if (token) {
      setAccessToken(token);
      if (refreshToken) {
        setRefreshTokenState(refreshToken);
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
      }
      setMfaRequired(false);
      setMfaToken(null);
      await fetchUserProfile(token);
    }
  };

  const registerUser = async (dto: IUserApiRegisterDTO): Promise<IUser> => {
    const response = await api.post<IUser>('/api/v1/auth/register', dto);
    return response.data;
  };

  const updateProfile = async (socialName: string, email: string, password?: string): Promise<void> => {
    if (!user?.id) {
      throw new Error('Usuário não autenticado.');
    }

    await api.put(
      '/api/v1/user/update',
      {
        id: user.id,
        socialName,
        email,
        password: password || undefined,
        isEnabled: user.enabled,
      },
      accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined
    );

    if (accessToken) {
      await fetchUserProfile(accessToken);
    }
  };

  const uploadAvatar = async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);

    await api.post(
      '/api/v1/auth/avatar',
      formData,
      {
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          'Content-Type': undefined,
        },
      }
    );

    if (accessToken) {
      await fetchUserProfile(accessToken);
    }
  };

  const deleteAvatar = async (): Promise<void> => {
    await api.delete(
      '/api/v1/auth/avatar',
      accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined
    );

    if (accessToken) {
      await fetchUserProfile(accessToken);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.put(
      '/api/v1/auth/password',
      {
        currentPassword,
        newPassword,
      },
      accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined
    );
  };

  const enrollMfa = async (): Promise<IMfaEnrollResponse> => {
    const response = await api.post<IMfaEnrollResponse>(
      '/api/v1/auth/mfa/enroll',
      {},
      accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined
    );
    return response.data;
  };

  const verifyMfa = async (code: string): Promise<void> => {
    await api.post(
      '/api/v1/auth/mfa/verify',
      { code },
      accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined
    );
    if (accessToken) {
      await fetchUserProfile(accessToken);
    }
  };

  const disableMfa = async (code: string): Promise<void> => {
    await api.post(
      '/api/v1/auth/mfa/disable',
      { code },
      accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined
    );
    if (accessToken) {
      await fetchUserProfile(accessToken);
    }
  };

  const loginMfa = async (code: string): Promise<void> => {
    if (!mfaToken) {
      throw new Error('Token de MFA não encontrado.');
    }

    const response = await api.post<IAuthResponse>('/api/v1/auth/mfa/login', {
      mfaToken,
      code,
    });

    const token = response.data.access_token || response.data.accessToken;
    const refreshToken = response.data.refresh_token || response.data.refreshToken;

    if (token) {
      setAccessToken(token);
      if (refreshToken) {
        setRefreshTokenState(refreshToken);
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
      }
      setMfaRequired(false);
      setMfaToken(null);
      await fetchUserProfile(token);
    }
  };

  const refresh = useCallback(async (): Promise<string | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshLogic = async (): Promise<string | null> => {
      const currentRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      if (!currentRefreshToken) {
        setAccessToken(null);
        setUser(null);
        return null;
      }

      try {
        const response = await api.post<IAuthResponse>(
          '/api/v1/auth/refresh',
          { refreshToken: currentRefreshToken }
        );

        const token = response.data.access_token || response.data.accessToken;
        const refreshToken = response.data.refresh_token || response.data.refreshToken;

        if (token) {
          setAccessToken(token);
          if (refreshToken) {
            setRefreshTokenState(refreshToken);
            localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
          }
          await fetchUserProfile(token);
          return token;
        }
        setAccessToken(null);
        setUser(null);
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        return null;
      } catch (error: unknown) {
        // Só o servidor recusando o refresh token encerra a sessão. Queda de rede, 5xx e 429 são transitórios: mantém o
        // refresh token (ainda válido) para a próxima tentativa, em vez de mandar o usuário logar de novo.
        if (isRefreshRejected(error)) {
          setAccessToken(null);
          setUser(null);
          localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        }
        return null;
      }
    };

    // Limpa a referência quando a promessa termina, por QUALQUER caminho. Um `finally` dentro do `refreshLogic` não basta:
    // o retorno antecipado (sem refresh token salvo) termina antes da atribuição abaixo e deixaria a promessa travada para
    // sempre — a partir daí todo `refresh()` devolvia `null` sem chamar o backend e o access token nunca era renovado.
    const promise: Promise<string | null> = refreshLogic().finally(() => {
      if (refreshPromiseRef.current === promise) {
        refreshPromiseRef.current = null;
      }
    });
    refreshPromiseRef.current = promise;
    return promise;
  }, [fetchUserProfile]);

  // Renovação proativa: o access token vale 15 min e quem só acompanha uma tela (ex.: Forza ao vivo) pode ficar sem
  // nenhuma ação do usuário. Renova um pouco antes de expirar, em vez de esperar um 401 no meio do polling.
  useEffect(() => {
    if (!accessToken) return undefined;
    const expiresAt = readTokenExpiryMs(accessToken);
    if (expiresAt === null) return undefined;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (delayMs: number) => {
      timer = setTimeout(() => {
        void refresh().then((token) => {
          // Com token novo o efeito reexecuta (o `accessToken` mudou). Sem token e com a sessão ainda de pé, a falha foi
          // transitória: tenta de novo em alguns segundos.
          if (!token && !cancelled && localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)) schedule(RENEW_RETRY_MS);
        });
      }, delayMs);
    };
    schedule(Math.max(expiresAt - Date.now() - RENEW_MARGIN_MS, MIN_RENEW_DELAY_MS));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [accessToken, refresh]);

  const logout = async (): Promise<void> => {
    try {
      if (accessToken) {
        await api.post(
          '/api/v1/auth/logout',
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      }
    } catch {
      // Falha no logout de backend ainda limpa o estado local
    } finally {
      setAccessToken(null);
      setRefreshTokenState(null);
      setUser(null);
      setMfaRequired(false);
      setMfaToken(null);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        await refresh();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    void initAuth(); // o try/finally interno sempre encerra o carregamento
    return () => {
      isMounted = false;
    };
  }, [refresh]);

  const isAuthenticated = Boolean(accessToken);
  const isAdmin = Boolean(user?.roles?.includes('ROLE_ADMIN'));

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
        mfaRequired,
        mfaToken,
        login,
        loginMfa,
        registerUser,
        updateProfile,
        uploadAvatar,
        deleteAvatar,
        changePassword,
        enrollMfa,
        verifyMfa,
        disableMfa,
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

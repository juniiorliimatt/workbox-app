import {
  FC,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { IAuthProviderProps } from '@/interfaces/IAuthProviderProps';
import { IAuthResponse } from '@/interfaces/IAuthResponse';
import { IUser } from '@/interfaces/IUser';
import { IUserApiRegisterDTO } from '@/interfaces/IUserApiRegisterDTO';
import { IMfaEnrollResponse } from '@/interfaces/IMfaEnrollResponse';
import api from '@/services/api';
import { AuthContext } from './AuthContextValue';

const REFRESH_TOKEN_STORAGE_KEY = 'workbox_refresh_token';

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

    if (response.data.mfa_required && response.data.mfa_token) {
      setMfaRequired(true);
      setMfaToken(response.data.mfa_token);
      setAccessToken(null);
      setUser(null);
      return;
    }

    if (response.data.access_token) {
      setAccessToken(response.data.access_token);
      if (response.data.refresh_token) {
        setRefreshTokenState(response.data.refresh_token);
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.data.refresh_token);
      }
      setMfaRequired(false);
      setMfaToken(null);
      await fetchUserProfile(response.data.access_token);
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
      accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        : undefined
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
      mfa_token: mfaToken,
      code,
    });

    if (response.data.access_token) {
      setAccessToken(response.data.access_token);
      if (response.data.refresh_token) {
        setRefreshTokenState(response.data.refresh_token);
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.data.refresh_token);
      }
      setMfaRequired(false);
      setMfaToken(null);
      await fetchUserProfile(response.data.access_token);
    }
  };

  const refresh = useCallback(async (): Promise<string | null> => {
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
      if (response.data.access_token) {
        setAccessToken(response.data.access_token);
        if (response.data.refresh_token) {
          setRefreshTokenState(response.data.refresh_token);
          localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.data.refresh_token);
        }
        await fetchUserProfile(response.data.access_token);
        return response.data.access_token;
      }
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      return null;
    } catch {
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      return null;
    }
  }, [fetchUserProfile]);

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
    initAuth();
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

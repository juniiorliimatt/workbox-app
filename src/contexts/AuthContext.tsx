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
import api from '@/services/api';
import { AuthContext } from './AuthContextValue';

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

  const login = async (username: string, password: string): Promise<void> => {
    const response = await api.post<IAuthResponse>('/api/v1/auth/login', {
      username,
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
      setMfaRequired(false);
      setMfaToken(null);
      await fetchUserProfile(response.data.access_token);
    }
  };

  const registerUser = async (dto: IUserApiRegisterDTO): Promise<IUser> => {
    const response = await api.post<IUser>('/api/v1/auth/register', dto);
    return response.data;
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
      setMfaRequired(false);
      setMfaToken(null);
      await fetchUserProfile(response.data.access_token);
    }
  };

  const refresh = useCallback(async (): Promise<string | null> => {
    try {
      const response = await api.post<IAuthResponse>('/api/v1/auth/refresh');
      if (response.data.access_token) {
        setAccessToken(response.data.access_token);
        await fetchUserProfile(response.data.access_token);
        return response.data.access_token;
      }
      setAccessToken(null);
      setUser(null);
      return null;
    } catch {
      setAccessToken(null);
      setUser(null);
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
      setUser(null);
      setMfaRequired(false);
      setMfaToken(null);
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
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserAvatar from '@/components/UserAvatar';
import { AuthContext } from '@/contexts/AuthContextValue';
import { IAuthContext } from '@/interfaces/IAuthContext';
import api from '@/services/api';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

vi.mock('@/services/api');

const mockAxiosResponse = <T,>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} } as InternalAxiosRequestConfig,
});

const createMockAuthContext = (overrides?: Partial<IAuthContext>): IAuthContext => ({
  accessToken: 'mock-access-token',
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
  refresh: vi.fn(),
  logout: vi.fn(),
  ...overrides,
});

describe('UserAvatar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/avatar-mock');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('renders initial fallback letter or icon when no avatarUrl is provided', () => {
    const auth = createMockAuthContext();
    render(
      <AuthContext.Provider value={auth}>
        <UserAvatar name="Carlos" data-testid="user-avatar" />
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('user-avatar')).toHaveTextContent('C');
  });

  it('fetches protected avatar blob with Bearer token when avatarUrl is provided', async () => {
    const auth = createMockAuthContext({ accessToken: 'valid-token' });
    const mockBlob = new Blob(['image-bytes'], { type: 'image/png' });

    vi.mocked(api.get).mockResolvedValueOnce(mockAxiosResponse(mockBlob));

    render(
      <AuthContext.Provider value={auth}>
        <UserAvatar
          avatarUrl="/api/v1/user/123/avatar"
          name="Carlos"
          data-testid="user-avatar"
        />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/user/123/avatar', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
        responseType: 'blob',
      });
      expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    });
  });
});

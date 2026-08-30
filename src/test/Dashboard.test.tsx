import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '@/pages/Dashboard';
import { AuthContext } from '@/contexts/AuthContextValue';
import { IAuthContext } from '@/interfaces/IAuthContext';
import { BrowserRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createMockAuthContext = (overrides?: Partial<IAuthContext>): IAuthContext => ({
  accessToken: 'header.payload.signature',
  user: {
    id: 'user-uuid-1234',
    username: 'admin',
    email: 'admin@workbox.local',
    enabled: true,
  },
  isAuthenticated: true,
  isLoading: false,
  mfaRequired: false,
  mfaToken: null,
  login: vi.fn(),
  loginMfa: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with user details and status cards', () => {
    const authValue = createMockAuthContext();

    render(
      <AuthContext.Provider value={authValue}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText(/Workbox Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Bem-vindo ao Workbox, admin!/i)).toBeInTheDocument();
    expect(screen.getByText(/user-uuid-1234/i)).toBeInTheDocument();
    expect(screen.getByText(/admin@workbox.local/i)).toBeInTheDocument();
    expect(screen.getByText(/Conta Ativa/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sair/i })).toBeInTheDocument();
  });

  it('executes logout and redirects to / on clicking Sair', async () => {
    const user = userEvent.setup();
    const authValue = createMockAuthContext();

    render(
      <AuthContext.Provider value={authValue}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    const logoutBtn = screen.getByRole('button', { name: /Sair/i });
    await user.click(logoutBtn);

    await waitFor(() => {
      expect(authValue.logout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});

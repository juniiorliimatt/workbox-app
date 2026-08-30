import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from '@/pages/Login';
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
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  mfaRequired: false,
  mfaToken: null,
  login: vi.fn().mockResolvedValue(undefined),
  loginMfa: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn().mockResolvedValue(null),
  logout: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const renderLogin = (contextValue?: Partial<IAuthContext>) => {
  const authValue = createMockAuthContext(contextValue);
  return {
    ...render(
      <AuthContext.Provider value={authValue}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </AuthContext.Provider>
    ),
    authValue,
  };
};

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with username, password fields and submit button', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: /Workbox App/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Usuário/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
  });

  it('displays validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    renderLogin();

    const submitBtn = screen.getByRole('button', { name: /Entrar/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Usuário é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/Senha é obrigatória/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility when clicking eye button', async () => {
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = screen.getByLabelText(/^Senha/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: /Exibir senha/i });
    await user.click(toggleBtn);

    expect(passwordInput).toHaveAttribute('type', 'text');

    const hideBtn = screen.getByRole('button', { name: /Ocultar senha/i });
    await user.click(hideBtn);

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('calls login and navigates to /dashboard on valid submission', async () => {
    const user = userEvent.setup();
    const { authValue } = renderLogin();

    await user.type(screen.getByLabelText(/^Usuário/i), 'admin');
    await user.type(screen.getByLabelText(/^Senha/i), 'admin123');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(authValue.login).toHaveBeenCalledWith('admin', 'admin123');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('renders MFA step when mfaRequired is true', () => {
    renderLogin({ mfaRequired: true, mfaToken: 'mock-mfa-token' });

    expect(screen.getByRole('heading', { name: /Autenticação em Duas Etapas/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Código MFA/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verificar/i })).toBeInTheDocument();
  });
});

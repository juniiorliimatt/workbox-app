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
  isAdmin: false,
  isLoading: false,
  mfaRequired: false,
  mfaToken: null,
  login: vi.fn().mockResolvedValue(undefined),
  loginMfa: vi.fn().mockResolvedValue(undefined),
  registerUser: vi.fn().mockResolvedValue({ id: '1', socialName: 'Novo Usuário', email: 'user@example.com', enabled: true }),
  changePassword: vi.fn().mockResolvedValue(undefined),
  enrollMfa: vi.fn().mockResolvedValue({ secret: 'mock', otpAuthUri: 'mock' }),
  verifyMfa: vi.fn().mockResolvedValue(undefined),
  disableMfa: vi.fn().mockResolvedValue(undefined),
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
    localStorage.clear();
  });

  it('renders login form with email, password, remember me checkbox and submit button', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: /Workbox App/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^E-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Senha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Lembrar de mim/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Entrar$/i })).toBeInTheDocument();
  });

  it('displays validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    renderLogin();

    const submitBtn = screen.getByRole('button', { name: /^Entrar$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/E-mail é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/Senha é obrigatória/i)).toBeInTheDocument();
    });
  });

  it('saves email to localStorage when Lembrar de mim is checked and login succeeds', async () => {
    const user = userEvent.setup();
    const { authValue } = renderLogin();

    await user.type(screen.getByLabelText(/^E-mail/i), 'admin@workbox.local');
    await user.type(screen.getByLabelText(/^Senha/i), 'admin123');
    await user.click(screen.getByLabelText(/Lembrar de mim/i));
    await user.click(screen.getByRole('button', { name: /^Entrar$/i }));

    await waitFor(() => {
      expect(authValue.login).toHaveBeenCalledWith('admin@workbox.local', 'admin123');
      expect(localStorage.getItem('workbox_remembered_email')).toBe('admin@workbox.local');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('pre-fills email and checks Lembrar de mim if stored in localStorage', () => {
    localStorage.setItem('workbox_remembered_email', 'saved@workbox.local');
    renderLogin();

    expect(screen.getByLabelText(/^E-mail/i)).toHaveValue('saved@workbox.local');
    expect(screen.getByLabelText(/Lembrar de mim/i)).toBeChecked();
  });

  it('switches to Novo Usuário tab and renders registration fields', async () => {
    const user = userEvent.setup();
    renderLogin();

    const novoUsuarioTab = screen.getByRole('tab', { name: /Novo Usuário/i });
    await user.click(novoUsuarioTab);

    expect(screen.getByRole('heading', { name: /Criar Nova Conta/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nome Social \/ Completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^E-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Senha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirmar Senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Criar Conta/i })).toBeInTheDocument();
  });

  it('validates password mismatch on registration', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('tab', { name: /Novo Usuário/i }));

    await user.type(screen.getByLabelText(/^Nome Social \/ Completo/i), 'Maria Silva');
    await user.type(screen.getByLabelText(/^E-mail/i), 'maria@example.com');
    await user.type(screen.getByLabelText(/^Senha/i), 'password123');
    await user.type(screen.getByLabelText(/^Confirmar Senha/i), 'different123');

    await user.click(screen.getByRole('button', { name: /Criar Conta/i }));

    await waitFor(() => {
      expect(screen.getByText(/As senhas não conferem/i)).toBeInTheDocument();
    });
  });

  it('submits registration successfully and returns to login tab', async () => {
    const user = userEvent.setup();
    const { authValue } = renderLogin();

    await user.click(screen.getByRole('tab', { name: /Novo Usuário/i }));

    await user.type(screen.getByLabelText(/^Nome Social \/ Completo/i), 'Maria Silva');
    await user.type(screen.getByLabelText(/^E-mail/i), 'maria@example.com');
    await user.type(screen.getByLabelText(/^Senha/i), 'password123');
    await user.type(screen.getByLabelText(/^Confirmar Senha/i), 'password123');

    await user.click(screen.getByRole('button', { name: /Criar Conta/i }));

    await waitFor(() => {
      expect(authValue.registerUser).toHaveBeenCalledWith({
        socialName: 'Maria Silva',
        email: 'maria@example.com',
        password: 'password123',
      });
      expect(screen.getByText(/Conta criada com sucesso!/i)).toBeInTheDocument();
    });
  });

  it('renders MFA step when mfaRequired is true', () => {
    renderLogin({ mfaRequired: true, mfaToken: 'mock-mfa-token' });

    expect(screen.getByRole('heading', { name: /Autenticação em Duas Etapas/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Código MFA/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verificar/i })).toBeInTheDocument();
  });
});

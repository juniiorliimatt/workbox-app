import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminUsuarios from '@/pages/AdminUsuarios';
import AdminPapeis from '@/pages/AdminPapeis';
import AdminAuditoria from '@/pages/AdminAuditoria';
import { AuthContext } from '@/contexts/AuthContextValue';
import { IAuthContext } from '@/interfaces/IAuthContext';
import api from '@/services/api';

vi.mock('@/services/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createMockAuthContext = (overrides?: Partial<IAuthContext>): IAuthContext => ({
  accessToken: 'mock-access-token',
  user: {
    id: 'admin-uuid-123',
    socialName: 'Admin User',
    email: 'admin@workbox.local',
    enabled: true,
    roles: ['ROLE_ADMIN'],
  },
  isAuthenticated: true,
  isAdmin: true,
  isLoading: false,
  mfaRequired: false,
  mfaToken: null,
  login: vi.fn().mockResolvedValue(undefined),
  loginMfa: vi.fn().mockResolvedValue(undefined),
  registerUser: vi.fn().mockResolvedValue({ id: '1', socialName: 'u', email: 'e@test.com', enabled: true }),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  uploadAvatar: vi.fn().mockResolvedValue(undefined),
  deleteAvatar: vi.fn().mockResolvedValue(undefined),
  changePassword: vi.fn().mockResolvedValue(undefined),
  enrollMfa: vi.fn().mockResolvedValue({ secret: 'JBSWY3DPEHPK3PXP', otpAuthUri: 'otpauth://totp/...' }),
  verifyMfa: vi.fn().mockResolvedValue(undefined),
  disableMfa: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn().mockResolvedValue(null),
  logout: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('Admin Module Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AdminUsuarios', () => {
    it('renders user list and handles creation dialog', async () => {
      const user = userEvent.setup();
      const mockUsers = [
        {
          id: '1',
          socialName: 'Carlos Silva',
          email: 'carlos@workbox.local',
          enabled: true,
          roles: [{ id: 2, authority: 'ROLE_USER' }],
        },
      ];
      const mockRoles = [
        { id: 1, authority: 'ROLE_ADMIN' },
        { id: 2, authority: 'ROLE_USER' },
      ];

      vi.mocked(api.get).mockImplementation((url) => {
        if (url.includes('/api/v1/user/find-all')) {
          return Promise.resolve({ data: { _embedded: { userApiDTOList: mockUsers } } });
        }
        if (url.includes('/api/v1/role')) {
          return Promise.resolve({ data: mockRoles });
        }
        return Promise.resolve({ data: [] });
      });

      vi.mocked(api.post).mockResolvedValue({ data: { id: '2', socialName: 'Novo User', email: 'novo@workbox.local' } });

      const authValue = createMockAuthContext();
      render(
        <AuthContext.Provider value={authValue}>
          <BrowserRouter>
            <AdminUsuarios />
          </BrowserRouter>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
        expect(screen.getByText('carlos@workbox.local')).toBeInTheDocument();
      });

      const novoBtn = screen.getByRole('button', { name: /Novo Usuário/i });
      await user.click(novoBtn);

      expect(screen.getByText('Cadastrar Novo Usuário')).toBeInTheDocument();

      const nameInput = screen.getByLabelText(/Nome Social \/ Como quer ser chamado/i);
      await user.type(nameInput, 'Novo Funcionario');

      const emailInput = screen.getByLabelText(/Endereço de E-mail/i);
      await user.type(emailInput, 'func@workbox.local');

      const passInput = screen.getByLabelText(/Senha Inicial/i);
      await user.type(passInput, 'Senha123!');

      const salvarBtn = screen.getByRole('button', { name: /^Salvar$/i });
      await user.click(salvarBtn);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/api/v1/user/save',
          expect.objectContaining({
            socialName: 'Novo Funcionario',
            email: 'func@workbox.local',
            password: 'Senha123!',
          }),
          expect.anything()
        );
      });
    }, 15000);
  });

  describe('AdminPapeis', () => {
    it('renders role list and creates a new role', async () => {
      const user = userEvent.setup();
      const mockRoles = [
        { id: 1, authority: 'ROLE_ADMIN' },
        { id: 2, authority: 'ROLE_USER' },
      ];

      vi.mocked(api.get).mockResolvedValue({ data: mockRoles });
      vi.mocked(api.post).mockResolvedValue({ data: { id: 3, authority: 'ROLE_FINANCE' } });

      const authValue = createMockAuthContext();
      render(
        <AuthContext.Provider value={authValue}>
          <BrowserRouter>
            <AdminPapeis />
          </BrowserRouter>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('ROLE_ADMIN')).toBeInTheDocument();
        expect(screen.getByText('ROLE_USER')).toBeInTheDocument();
      });

      const novoPapelBtn = screen.getByRole('button', { name: /Novo Papel/i });
      await user.click(novoPapelBtn);

      expect(screen.getByText('Criar Novo Papel')).toBeInTheDocument();

      const input = screen.getByLabelText(/Nome da Autoridade/i);
      await user.clear(input);
      await user.type(input, 'ROLE_FINANCE');

      const salvarBtn = screen.getByRole('button', { name: /^Salvar$/i });
      await user.click(salvarBtn);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/api/v1/role',
          { authority: 'ROLE_FINANCE' },
          expect.anything()
        );
      });
    }, 15000);
  });

  describe('AdminAuditoria', () => {
    it('renders login audit logs and filters by term', async () => {
      const user = userEvent.setup();
      const authValue = createMockAuthContext();
      render(
        <AuthContext.Provider value={authValue}>
          <BrowserRouter>
            <AdminAuditoria />
          </BrowserRouter>
        </AuthContext.Provider>
      );

      expect(screen.getByText('Trilha de Auditoria & Segurança de Acesso')).toBeInTheDocument();
      expect(screen.getAllByText('admin@workbox.local').length).toBeGreaterThan(0);

      const searchInput = screen.getByPlaceholderText(/Filtrar por e-mail, IP ou detalhe.../i);
      await user.type(searchInput, 'attacker');

      expect(screen.getByText('attacker@botnet.org')).toBeInTheDocument();
      expect(screen.queryByText('cliente@workbox.local')).not.toBeInTheDocument();
    }, 15000);
  });
});

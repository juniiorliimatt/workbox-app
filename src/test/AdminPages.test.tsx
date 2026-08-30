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

    it('opens user audit history modal and displays revisions', async () => {
      const user = userEvent.setup();
      const mockUsers = [
        {
          id: 'user-uuid-1',
          socialName: 'Ana Souza',
          email: 'ana@workbox.local',
          enabled: true,
          roles: [{ id: 2, authority: 'ROLE_USER' }],
        },
      ];
      const mockUserHistory = [
        {
          revision: 101,
          revisionType: 'ADD',
          changedAt: '2026-08-30T10:00:00',
          changedBy: 'admin@workbox.local',
          id: 'user-uuid-1',
          socialName: 'Ana Souza',
          email: 'ana@workbox.local',
          enabled: true,
          mfaEnabled: false,
        },
      ];

      vi.mocked(api.get).mockImplementation((url) => {
        if (url.includes('/api/v1/user/find-all')) {
          return Promise.resolve({ data: { _embedded: { userApiDTOList: mockUsers } } });
        }
        if (url.includes('/api/v1/audit/users/user-uuid-1/history')) {
          return Promise.resolve({ data: mockUserHistory });
        }
        return Promise.resolve({ data: [] });
      });

      const authValue = createMockAuthContext();
      render(
        <AuthContext.Provider value={authValue}>
          <BrowserRouter>
            <AdminUsuarios />
          </BrowserRouter>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('Ana Souza')).toBeInTheDocument();
      });

      const auditBtn = screen.getByRole('button', { name: /Auditoria do usuário/i });
      await user.click(auditBtn);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/api/v1/audit/users/user-uuid-1/history', expect.anything());
        expect(screen.getByText(/Histórico de Auditoria: Ana Souza/i)).toBeInTheDocument();
        expect(screen.getByText('#101')).toBeInTheDocument();
        expect(screen.getByText('Criação (ADD)')).toBeInTheDocument();
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

      await waitFor(() => {
        expect(screen.getByText('Criar Novo Papel')).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/Nome da Autoridade/i);
      await user.clear(input);
      await user.type(input, 'FINANCE');

      const salvarBtn = screen.getByRole('button', { name: /^Salvar$/i });
      await user.click(salvarBtn);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/api/v1/role',
          { authority: 'FINANCE' },
          expect.anything()
        );
      });
    }, 15000);

    it('opens role audit history modal and displays revisions', async () => {
      const user = userEvent.setup();
      const mockRoles = [
        { id: 5, authority: 'ROLE_MANAGER' },
      ];
      const mockRoleHistory = [
        {
          revision: 202,
          revisionType: 'ADD',
          changedAt: '2026-08-30T11:00:00',
          changedBy: 'admin@workbox.local',
          id: 5,
          authority: 'ROLE_MANAGER',
        },
      ];

      vi.mocked(api.get).mockImplementation((url) => {
        if (url === '/api/v1/role') {
          return Promise.resolve({ data: mockRoles });
        }
        if (url.includes('/api/v1/audit/roles/5/history')) {
          return Promise.resolve({ data: mockRoleHistory });
        }
        return Promise.resolve({ data: [] });
      });

      const authValue = createMockAuthContext();
      render(
        <AuthContext.Provider value={authValue}>
          <BrowserRouter>
            <AdminPapeis />
          </BrowserRouter>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('ROLE_MANAGER')).toBeInTheDocument();
      });

      const auditBtn = screen.getByRole('button', { name: /Auditoria do papel/i });
      await user.click(auditBtn);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/api/v1/audit/roles/5/history', expect.anything());
        expect(screen.getByText(/Histórico de Auditoria: ROLE_MANAGER/i)).toBeInTheDocument();
        expect(screen.getByText('#202')).toBeInTheDocument();
      });
    }, 15000);
  });

  describe('AdminAuditoria', () => {
    it('fetches and renders login audit logs with pagination and filters', async () => {
      const user = userEvent.setup();
      const mockAuditPage = {
        content: [
          {
            id: 'audit-1',
            email: 'admin@workbox.local',
            successful: true,
            reason: 'mfa_verified',
            ipAddress: '192.168.1.10',
            createdAt: '2026-08-30T12:00:00',
          },
          {
            id: 'audit-2',
            email: 'hacker@bot.net',
            successful: false,
            reason: 'bad_credentials',
            ipAddress: '200.100.50.25',
            createdAt: '2026-08-30T12:05:00',
          },
        ],
        totalElements: 2,
        totalPages: 1,
        number: 0,
        size: 10,
        numberOfElements: 2,
        first: true,
        last: true,
        empty: false,
      };

      vi.mocked(api.get).mockResolvedValue({ data: mockAuditPage });

      const authValue = createMockAuthContext();
      render(
        <AuthContext.Provider value={authValue}>
          <BrowserRouter>
            <AdminAuditoria />
          </BrowserRouter>
        </AuthContext.Provider>
      );

      expect(screen.getByText('Trilha de Auditoria & Segurança de Acesso')).toBeInTheDocument();

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/api/v1/audit/logins',
          expect.objectContaining({
            params: expect.objectContaining({
              page: 0,
              size: 10,
            }),
          })
        );
        expect(screen.getByText('admin@workbox.local')).toBeInTheDocument();
        expect(screen.getByText('MFA Validado com Sucesso')).toBeInTheDocument();
        expect(screen.getByText('hacker@bot.net')).toBeInTheDocument();
        expect(screen.getByText('Senha Incorreta')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/Filtrar por E-mail/i);
      await user.type(emailInput, 'admin@workbox.local');

      const filterBtn = screen.getByRole('button', { name: /^Filtrar$/i });
      await user.click(filterBtn);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/api/v1/audit/logins',
          expect.objectContaining({
            params: expect.objectContaining({
              email: 'admin@workbox.local',
            }),
          })
        );
      });
    }, 15000);
  });
});

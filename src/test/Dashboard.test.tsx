import { render, screen } from '@testing-library/react';
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
  accessToken: 'mock-access-token',
  user: {
    id: '123',
    socialName: 'Administrador',
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
  enrollMfa: vi.fn().mockResolvedValue({ secret: 'mock', otpAuthUri: 'mock' }),
  verifyMfa: vi.fn().mockResolvedValue(undefined),
  disableMfa: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn().mockResolvedValue(null),
  logout: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const renderDashboard = (contextValue?: Partial<IAuthContext>) => {
  const authValue = createMockAuthContext(contextValue);
  return {
    ...render(
      <AuthContext.Provider value={authValue}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </AuthContext.Provider>
    ),
    authValue,
  };
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 14 cards with Administração as the first card when user is an administrator', () => {
    renderDashboard({ isAdmin: true });

    expect(screen.getByText(/Olá, Administrador! Selecione um módulo/i)).toBeInTheDocument();

    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles[0]).toBe('Administração');
    expect(titles[1]).toBe('Finanças');
    expect(titles[2]).toBe('Forza');
    expect(titles[3]).toBe('Moto');
    expect(titles).toHaveLength(14);

    expect(screen.getByText('Administração')).toBeInTheDocument();
    expect(screen.getByText('Finanças')).toBeInTheDocument();
    expect(screen.getByText('Moto')).toBeInTheDocument();
    expect(screen.getByText('Tarefas & Projetos')).toBeInTheDocument();
    expect(screen.getByText('Documentos & Wiki')).toBeInTheDocument();
    expect(screen.getByText('Comunicação & Chat')).toBeInTheDocument();
    expect(screen.getByText('Relatórios & Analytics')).toBeInTheDocument();
    expect(screen.getByText('CRM & Clientes')).toBeInTheDocument();
    expect(screen.getByText('Estoque & Produtos')).toBeInTheDocument();
    expect(screen.getByText('RH & Pessoas')).toBeInTheDocument();
    expect(screen.getByText('Automações & Webhooks')).toBeInTheDocument();
    expect(screen.getByText('Configurações Globais')).toBeInTheDocument();
    expect(screen.getByText('Suporte & Helpdesk')).toBeInTheDocument();

    const emBreveBadges = screen.getAllByText(/Em breve/i);
    expect(emBreveBadges).toHaveLength(10);
  });

  const regularUser = (modules?: string[]) => ({
    isAdmin: false,
    user: {
      id: '456',
      socialName: 'Usuário Padrão',
      email: 'user@workbox.local',
      enabled: true,
      roles: ['ROLE_USER'],
      modules,
    },
  });

  it('hides the Administração card when user is a regular non-admin user (Finanças comes first)', () => {
    renderDashboard(regularUser(['FINANCAS', 'FORZA']));

    expect(screen.getByText(/Olá, Usuário Padrão! Selecione um módulo/i)).toBeInTheDocument();

    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles[0]).toBe('Finanças');

    expect(screen.getByText('Finanças')).toBeInTheDocument();
    expect(screen.queryByText('Administração')).not.toBeInTheDocument();
  });

  it('shows only the modules granted to the user (Forza without Finanças)', () => {
    renderDashboard(regularUser(['FORZA']));

    expect(screen.getByText('Forza')).toBeInTheDocument();
    expect(screen.queryByText('Finanças')).not.toBeInTheDocument();
  });

  it('shows the Moto card only to users with the MOTO module', () => {
    const { unmount } = renderDashboard(regularUser(['MOTO']));
    expect(screen.getByText('Moto')).toBeInTheDocument();
    expect(screen.queryByText('Finanças')).not.toBeInTheDocument();
    expect(screen.queryByText('Forza')).not.toBeInTheDocument();
    unmount();

    renderDashboard(regularUser(['FINANCAS', 'FORZA']));
    expect(screen.queryByText('Moto')).not.toBeInTheDocument();
  });

  it('shows no module card for a freshly created user (USER only, no module role yet)', () => {
    renderDashboard(regularUser([]));

    expect(screen.queryByText('Finanças')).not.toBeInTheDocument();
    expect(screen.queryByText('Moto')).not.toBeInTheDocument();
    expect(screen.queryByText('Forza')).not.toBeInTheDocument();
    expect(screen.queryByText('Administração')).not.toBeInTheDocument();
  });

  it('treats a profile without the modules field as having no module', () => {
    renderDashboard(regularUser(undefined));

    expect(screen.queryByText('Finanças')).not.toBeInTheDocument();
    expect(screen.queryByText('Forza')).not.toBeInTheDocument();
  });

  it('navigates to /admin when clicking the Administração card', async () => {
    const user = userEvent.setup();
    renderDashboard({ isAdmin: true });

    const adminCard = screen.getByText('Administração');
    await user.click(adminCard);

    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  it('navigates to /financas when clicking the Finanças card', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const financasCard = screen.getByText('Finanças');
    await user.click(financasCard);

    expect(mockNavigate).toHaveBeenCalledWith('/financas');
  });

  it('navigates to /forza when clicking the Forza card', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByText('Forza'));

    expect(mockNavigate).toHaveBeenCalledWith('/forza');
  });

  it('navigates to /moto when clicking the Moto card', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByText('Moto'));

    expect(mockNavigate).toHaveBeenCalledWith('/moto');
  });

  it('calls logout when clicking the Sair button', async () => {
    const user = userEvent.setup();
    const { authValue } = renderDashboard();

    const sairBtn = screen.getByRole('button', { name: /Sair/i });
    await user.click(sairBtn);

    expect(authValue.logout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});

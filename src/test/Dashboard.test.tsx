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
    username: 'admin',
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
  registerUser: vi.fn().mockResolvedValue({ id: '1', username: 'u', email: 'e', enabled: true }),
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

  it('renders all 12 cards with Administração as the first card when user is an administrator', () => {
    renderDashboard({ isAdmin: true });

    expect(screen.getByText(/Olá, admin! Selecione um módulo/i)).toBeInTheDocument();

    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles[0]).toBe('Administração');
    expect(titles[1]).toBe('Finanças');

    expect(screen.getByText('Administração')).toBeInTheDocument();
    expect(screen.getByText('Finanças')).toBeInTheDocument();
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

  it('hides the Administração card when user is a regular non-admin user (Finanças comes first)', () => {
    renderDashboard({
      isAdmin: false,
      user: {
        id: '456',
        username: 'regular_user',
        email: 'user@workbox.local',
        enabled: true,
        roles: ['ROLE_USER'],
      },
    });

    expect(screen.getByText(/Olá, regular_user! Selecione um módulo/i)).toBeInTheDocument();

    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles[0]).toBe('Finanças');

    expect(screen.getByText('Finanças')).toBeInTheDocument();
    expect(screen.queryByText('Administração')).not.toBeInTheDocument();
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

  it('calls logout when clicking the Sair button', async () => {
    const user = userEvent.setup();
    const { authValue } = renderDashboard();

    const sairBtn = screen.getByRole('button', { name: /Sair/i });
    await user.click(sairBtn);

    expect(authValue.logout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});

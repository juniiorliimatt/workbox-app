import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminModulos from '@/pages/AdminModulos';
import Admin from '@/pages/Admin';
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

const authValue: IAuthContext = {
  accessToken: 'mock-access-token',
  user: { id: 'admin-1', socialName: 'Admin', email: 'admin@workbox.local', enabled: true, roles: ['ROLE_ADMIN'] },
  isAuthenticated: true,
  isAdmin: true,
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
};

const MODULES = [
  { id: 1, code: 'FINANCAS', name: 'Finanças' },
  { id: 2, code: 'FORZA', name: 'Forza' },
];

const ROLES = [
  { id: 1, authority: 'ADMIN', module: null },
  { id: 2, authority: 'USER', module: null },
  { id: 3, authority: 'FINANCAS', module: { id: 1, code: 'FINANCAS', name: 'Finanças' } },
  { id: 4, authority: 'CONTADOR', module: null },
];

const mockLoad = () => {
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === '/api/v1/module') return { data: MODULES };
    if (url === '/api/v1/role') return { data: ROLES };
    throw new Error(`GET inesperado: ${url}`);
  });
};

const renderPage = () =>
  render(
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <AdminModulos />
      </BrowserRouter>
    </AuthContext.Provider>
  );

describe('AdminModulos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista as roles de módulo com o módulo atual e deixa ADMIN e USER de fora', async () => {
    mockLoad();
    renderPage();

    const financasRow = (await screen.findByText('FINANCAS')).closest('tr') as HTMLElement;
    expect(within(financasRow).getByText('Finanças')).toBeInTheDocument();

    const contadorRow = screen.getByText('CONTADOR').closest('tr') as HTMLElement;
    expect(within(contadorRow).getByText('Sem módulo')).toBeInTheDocument();

    expect(screen.queryByText('ADMIN')).not.toBeInTheDocument();
    expect(screen.queryByText('USER')).not.toBeInTheDocument();
  });

  it('vincula uma role a um módulo e confirma ao usuário', async () => {
    const user = userEvent.setup();
    mockLoad();
    vi.mocked(api.put).mockResolvedValue({
      data: { id: 4, authority: 'CONTADOR', module: { id: 2, code: 'FORZA', name: 'Forza' } },
    });
    renderPage();

    await screen.findByText('CONTADOR');
    await user.click(screen.getByRole('combobox', { name: /Módulo do papel CONTADOR/i }));
    await user.click(await screen.findByRole('option', { name: 'Forza' }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/v1/role/4/module', { moduleId: 2 }, expect.anything());
    });
    expect(await screen.findByText(/CONTADOR vinculado ao módulo Forza/i)).toBeInTheDocument();
  });

  it('desvincula a role escolhendo "Sem módulo"', async () => {
    const user = userEvent.setup();
    mockLoad();
    vi.mocked(api.put).mockResolvedValue({ data: { id: 3, authority: 'FINANCAS', module: null } });
    renderPage();

    await screen.findByText('FINANCAS');
    await user.click(screen.getByRole('combobox', { name: /Módulo do papel FINANCAS/i }));
    await user.click(await screen.findByRole('option', { name: 'Sem módulo' }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/v1/role/3/module', { moduleId: null }, expect.anything());
    });
    expect(await screen.findByText(/FINANCAS desvinculado de módulo/i)).toBeInTheDocument();
  });

  it('mostra o erro do servidor e mantém o valor anterior quando o vínculo falha', async () => {
    const user = userEvent.setup();
    mockLoad();
    vi.mocked(api.put).mockRejectedValue({ isAxiosError: true, response: { status: 404, data: { detail: 'Módulo não encontrado' } } });
    renderPage();

    await screen.findByText('CONTADOR');
    await user.click(screen.getByRole('combobox', { name: /Módulo do papel CONTADOR/i }));
    await user.click(await screen.findByRole('option', { name: 'Forza' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Falha ao vincular|Módulo não encontrado/i);
    const contadorRow = screen.getByText('CONTADOR').closest('tr') as HTMLElement;
    expect(within(contadorRow).getByText('Sem módulo')).toBeInTheDocument();
  });

  it('mostra erro quando a listagem não carrega', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('rede'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Falha ao carregar|Erro ao consultar/i);
  });
});

describe('Admin — card Papéis × Módulos', () => {
  it('abre a tela de vínculo ao clicar no card', async () => {
    const user = userEvent.setup();
    render(
      <AuthContext.Provider value={authValue}>
        <BrowserRouter>
          <Admin />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    await user.click(screen.getByText('Papéis × Módulos'));

    expect(mockNavigate).toHaveBeenCalledWith('/admin/modulos');
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Admin from '@/pages/Admin';
import { AuthContext } from '@/contexts/AuthContextValue';
import { IAuthContext } from '@/interfaces/IAuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const authValue = {
  accessToken: 'mock-access-token',
  user: { id: 'admin-1', socialName: 'Admin', email: 'admin@workbox.local', enabled: true, roles: ['ROLE_ADMIN'] },
  isAuthenticated: true,
  isAdmin: true,
  isLoading: false,
  mfaRequired: false,
  mfaToken: null,
  logout: vi.fn(),
} as unknown as IAuthContext;

const renderAdmin = () =>
  render(
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <Admin />
      </BrowserRouter>
    </AuthContext.Provider>
  );

describe('Admin · painel de administração', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra os cinco cards na ordem, cada um com título e descrição', () => {
    renderAdmin();

    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(['Gestão de Usuários', 'Papéis & Permissões', 'Papéis × Módulos', 'Backup do banco', 'Auditoria de Logins']);
    expect(screen.getAllByText('Gerenciar')).toHaveLength(4);
    expect(screen.getAllByText('Visualizar')).toHaveLength(1);
  });

  it.each([
    ['Gestão de Usuários', '/admin/usuarios'],
    ['Papéis & Permissões', '/admin/papeis'],
    ['Papéis × Módulos', '/admin/modulos'],
    ['Backup do banco', '/admin/backups'],
    ['Auditoria de Logins', '/admin/auditoria'],
  ])('o card "%s" abre %s', async (title, path) => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(screen.getByText(title));

    expect(mockNavigate).toHaveBeenCalledWith(path);
  });
});

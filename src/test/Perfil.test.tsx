import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Perfil from '@/pages/Perfil';
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
    id: 'user-uuid-1234',
    socialName: 'Maria Silva',
    email: 'maria@workbox.local',
    enabled: true,
    roles: ['ROLE_USER'],
  },
  isAuthenticated: true,
  isAdmin: false,
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
  enrollMfa: vi.fn().mockResolvedValue({ secret: 'JBSWY3DPEHPK3PXP', otpAuthUri: 'otpauth://totp/WorkBox:maria@workbox.local?secret=JBSWY3DPEHPK3PXP&issuer=WorkBox' }),
  verifyMfa: vi.fn().mockResolvedValue(undefined),
  disableMfa: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn().mockResolvedValue(null),
  logout: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const renderPerfil = (contextValue?: Partial<IAuthContext>) => {
  const authValue = createMockAuthContext(contextValue);
  return {
    ...render(
      <AuthContext.Provider value={authValue}>
        <BrowserRouter>
          <Perfil />
        </BrowserRouter>
      </AuthContext.Provider>
    ),
    authValue,
  };
};

describe('Perfil Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user details and account edit form with initial values', () => {
    renderPerfil();

    expect(screen.getByRole('heading', { name: /Meu Perfil & Segurança/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('user-uuid-1234')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Maria Silva')).toBeInTheDocument();
    expect(screen.getByDisplayValue('maria@workbox.local')).toBeInTheDocument();
    expect(screen.getByText('Conta Ativa')).toBeInTheDocument();
    expect(screen.getByText('Carregar Imagem')).toBeInTheDocument();
  });

  it('submits updated profile data successfully', async () => {
    const user = userEvent.setup();
    const { authValue } = renderPerfil();

    const socialNameInput = screen.getByLabelText(/Nome Social \/ Como quer ser chamado/i);
    await user.clear(socialNameInput);
    await user.type(socialNameInput, 'Maria Silva Santos');

    const passwordInput = screen.getByLabelText(/Confirmar com Senha Atual/i);
    await user.type(passwordInput, 'SenhaAtual123!');

    const saveBtn = screen.getByRole('button', { name: /Salvar Alterações/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(authValue.updateProfile).toHaveBeenCalledWith(
        'Maria Silva Santos',
        'maria@workbox.local',
        'SenhaAtual123!'
      );
      expect(screen.getByText(/Informações cadastrais atualizadas com sucesso!/i)).toBeInTheDocument();
    });
  });

  it('validates password change form when submitting mismatched passwords', async () => {
    const user = userEvent.setup();
    renderPerfil();

    await user.type(screen.getByLabelText(/^Senha Atual/i), 'oldPassword123');
    await user.type(screen.getByLabelText(/^Nova Senha/i), 'newPassword123');
    await user.type(screen.getByLabelText(/^Confirmar Nova Senha/i), 'differentPassword123');

    await user.click(screen.getByRole('button', { name: /Atualizar Senha/i }));

    await waitFor(() => {
      expect(screen.getByText(/As novas senhas não conferem/i)).toBeInTheDocument();
    });
  });

  it('submits password change successfully', async () => {
    const user = userEvent.setup();
    const { authValue } = renderPerfil();

    await user.type(screen.getByLabelText(/^Senha Atual/i), 'oldPassword123');
    await user.type(screen.getByLabelText(/^Nova Senha/i), 'newPassword123');
    await user.type(screen.getByLabelText(/^Confirmar Nova Senha/i), 'newPassword123');

    await user.click(screen.getByRole('button', { name: /Atualizar Senha/i }));

    await waitFor(() => {
      expect(authValue.changePassword).toHaveBeenCalledWith('oldPassword123', 'newPassword123');
      expect(screen.getByText(/Senha alterada com sucesso!/i)).toBeInTheDocument();
    });
  });

  it('initiates MFA enrollment and renders QR Code and verifies TOTP code', async () => {
    const user = userEvent.setup();
    const { authValue } = renderPerfil();

    const enrollBtn = screen.getByRole('button', { name: /Configurar \/ Habilitar MFA/i });
    await user.click(enrollBtn);

    await waitFor(() => {
      expect(authValue.enrollMfa).toHaveBeenCalled();
      expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
      expect(screen.getByText(/Escaneie o QR Code no seu aplicativo autenticador/i)).toBeInTheDocument();
    });

    const codeInput = screen.getByPlaceholderText(/Ex: 123456/i);
    await user.type(codeInput, '123456');

    const verifyBtn = screen.getByRole('button', { name: /Confirmar e Ativar/i });
    await user.click(verifyBtn);

    await waitFor(() => {
      expect(authValue.verifyMfa).toHaveBeenCalledWith('123456');
      expect(screen.getByText(/Autenticação em Duas Etapas \(MFA\) ativada com sucesso!/i)).toBeInTheDocument();
    });
  });

  it('handles MFA disabling flow', async () => {
    const user = userEvent.setup();
    const { authValue } = renderPerfil();

    const disableSectionBtn = screen.getByRole('button', { name: /Desativar MFA/i });
    await user.click(disableSectionBtn);

    const disableInput = screen.getByPlaceholderText(/Código de 6 dígitos/i);
    await user.type(disableInput, '654321');

    const confirmDisableBtn = screen.getByRole('button', { name: /^Desativar$/i });
    await user.click(confirmDisableBtn);

    await waitFor(() => {
      expect(authValue.disableMfa).toHaveBeenCalledWith('654321');
      expect(screen.getByText(/Autenticação em Duas Etapas \(MFA\) desativada com sucesso/i)).toBeInTheDocument();
    });
  });

  it('navigates back to dashboard when clicking Voltar aos Módulos', async () => {
    const user = userEvent.setup();
    renderPerfil();

    const backBtn = screen.getByRole('button', { name: /Voltar aos Módulos/i });
    await user.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});

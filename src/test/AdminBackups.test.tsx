import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminBackups from '@/pages/AdminBackups';
import Admin from '@/pages/Admin';
import { AuthContext } from '@/contexts/AuthContextValue';
import { IAuthContext } from '@/interfaces/IAuthContext';
import { IBackupInfo } from '@/interfaces/IBackupInfo';
import api from '@/services/api';

vi.mock('@/services/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
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

const BACKUP: IBackupInfo = {
  id: 'workbox_20261004_150000',
  fileName: 'workbox_20261004_150000.dump',
  path: '/home/jr/work/projetos/workbox/backups/workbox_20261004_150000.dump',
  sizeBytes: 2_621_440,
  sha256: 'ab12cd34'.repeat(8),
  createdAt: '2026-10-04T15:00:00Z',
  createdBy: 'qa.admin@workbox.local',
  encrypted: false,
};
const ENCRYPTED: IBackupInfo = {
  ...BACKUP,
  id: 'workbox_20261003_150000',
  fileName: 'workbox_20261003_150000.dump.enc',
  path: '/home/jr/work/projetos/workbox/backups/workbox_20261003_150000.dump.enc',
  createdAt: '2026-10-03T15:00:00Z',
  encrypted: true,
};

const PASSPHRASE = 'uma-senha-bem-forte-123';

const renderPage = () =>
  render(
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <AdminBackups />
      </BrowserRouter>
    </AuthContext.Provider>
  );

const stubList = (items: IBackupInfo[]) => vi.mocked(api.get).mockResolvedValue({ data: items });

describe('AdminBackups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista os backups com caminho no host, tamanho, quem gerou e se está cifrado', async () => {
    stubList([BACKUP, ENCRYPTED]);
    renderPage();

    const row = (await screen.findByText(BACKUP.fileName)).closest('tr') as HTMLElement;
    expect(within(row).getByText(BACKUP.path)).toBeInTheDocument();
    expect(within(row).getByText('2,5 MB')).toBeInTheDocument();
    expect(within(row).getByText('qa.admin@workbox.local')).toBeInTheDocument();
    expect(within(row).getByText('ab12cd34ab12…')).toBeInTheDocument();
    expect(within(row).queryByText('Cifrado')).not.toBeInTheDocument();

    const encRow = screen.getByText(ENCRYPTED.fileName).closest('tr') as HTMLElement;
    expect(within(encRow).getByText('Cifrado')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/api/v1/backups', expect.anything());
  });

  it('mostra estado vazio quando não há backups', async () => {
    stubList([]);
    renderPage();

    expect(await screen.findByText(/Nenhum backup gerado ainda/i)).toBeInTheDocument();
  });

  it('avisa que o restore é só por script e não oferece restore na tela', async () => {
    stubList([BACKUP]);
    renderPage();

    await screen.findByText(BACKUP.fileName);
    expect(screen.getByText(/restore-db\.sh/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /restaur|restore/i })).not.toBeInTheDocument();
  });

  it('gera um backup sem senha e mostra onde o arquivo ficou', async () => {
    const user = userEvent.setup();
    stubList([]);
    vi.mocked(api.post).mockResolvedValue({ data: BACKUP });
    renderPage();
    await screen.findByText(/Nenhum backup gerado ainda/i);

    await user.click(screen.getByRole('button', { name: /Gerar backup agora/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/backups', {}, expect.anything()));
    expect(await screen.findByRole('status')).toHaveTextContent(BACKUP.path);
    expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThanOrEqual(2); // recarregou a lista
  });

  it('cifra com senha: valida tamanho e confirmação antes de enviar', async () => {
    const user = userEvent.setup();
    stubList([]);
    renderPage();
    await screen.findByText(/Nenhum backup gerado ainda/i);

    await user.click(screen.getByRole('checkbox', { name: /Cifrar com senha/i }));
    await user.type(screen.getByLabelText(/^Senha de cifra/i), 'curta');
    await user.type(screen.getByLabelText(/Confirmar senha/i), 'curta');
    await user.click(screen.getByRole('button', { name: /Gerar backup agora/i }));
    expect(await screen.findByText(/pelo menos 12 caracteres/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/^Senha de cifra/i));
    await user.type(screen.getByLabelText(/^Senha de cifra/i), PASSPHRASE);
    await user.click(screen.getByRole('button', { name: /Gerar backup agora/i }));
    expect(await screen.findByText(/confirmação não confere/i)).toBeInTheDocument();

    expect(api.post).not.toHaveBeenCalled();
  });

  it('envia a senha de cifra, avisa que o arquivo está cifrado e limpa os campos', async () => {
    const user = userEvent.setup();
    stubList([]);
    vi.mocked(api.post).mockResolvedValue({ data: ENCRYPTED });
    renderPage();
    await screen.findByText(/Nenhum backup gerado ainda/i);

    await user.click(screen.getByRole('checkbox', { name: /Cifrar com senha/i }));
    await user.type(screen.getByLabelText(/^Senha de cifra/i), PASSPHRASE);
    await user.type(screen.getByLabelText(/Confirmar senha/i), PASSPHRASE);
    await user.click(screen.getByRole('button', { name: /Gerar backup agora/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/api/v1/backups', { passphrase: PASSPHRASE, passphraseConfirmation: PASSPHRASE }, expect.anything())
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/cifrado/i);
    expect(screen.getByLabelText(/^Senha de cifra/i)).toHaveValue('');
    expect(screen.getByLabelText(/Confirmar senha/i)).toHaveValue('');
  });

  it('trava o botão enquanto o backup está sendo gerado', async () => {
    const user = userEvent.setup();
    stubList([]);
    let finish: (value: unknown) => void = () => undefined;
    vi.mocked(api.post).mockReturnValue(new Promise((resolve) => { finish = resolve; }) as never);
    renderPage();
    await screen.findByText(/Nenhum backup gerado ainda/i);

    await user.click(screen.getByRole('button', { name: /Gerar backup agora/i }));

    expect(await screen.findByRole('button', { name: /Gerando/i })).toBeDisabled();
    finish({ data: BACKUP });
    await screen.findByRole('button', { name: /Gerar backup agora/i });
  });

  it('mostra a mensagem do servidor quando a geração falha (ex.: já em andamento)', async () => {
    const user = userEvent.setup();
    stubList([]);
    vi.mocked(api.post).mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { detail: 'Já existe um backup em andamento.' } } });
    renderPage();
    await screen.findByText(/Nenhum backup gerado ainda/i);

    await user.click(screen.getByRole('button', { name: /Gerar backup agora/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe um backup em andamento.');
  });

  it('baixa o arquivo autenticado como blob e dispara o download com o nome do arquivo', async () => {
    const user = userEvent.setup();
    stubList([BACKUP]);
    const blob = new Blob(['PGDMP']);
    vi.mocked(api.get).mockImplementation(async (url: string) => (url.endsWith('/download') ? { data: blob } : { data: [BACKUP] }));
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/backup');
    globalThis.URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderPage();

    await user.click(await screen.findByRole('button', { name: new RegExp(`Baixar ${BACKUP.fileName}`, 'i') }));

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(`/api/v1/backups/${BACKUP.id}/download`, expect.objectContaining({ responseType: 'blob' }))
    );
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/backup');
  });

  it('exclui só depois de confirmar', async () => {
    const user = userEvent.setup();
    stubList([BACKUP]);
    vi.mocked(api.delete).mockResolvedValue({ data: undefined });
    renderPage();

    await user.click(await screen.findByRole('button', { name: new RegExp(`Excluir ${BACKUP.fileName}`, 'i') }));
    await user.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(api.delete).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: new RegExp(`Excluir ${BACKUP.fileName}`, 'i') }));
    await user.click(screen.getByRole('button', { name: /Confirmar/i }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith(`/api/v1/backups/${BACKUP.id}`, expect.anything()));
  });

  it('mostra erro quando a lista não carrega', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('rede'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Falha ao carregar|Erro ao consultar/i);
  });
});

describe('Admin — card Backup do banco', () => {
  it('abre a tela de backups ao clicar no card', async () => {
    const user = userEvent.setup();
    render(
      <AuthContext.Provider value={authValue}>
        <BrowserRouter>
          <Admin />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    await user.click(screen.getByText('Backup do banco'));

    expect(mockNavigate).toHaveBeenCalledWith('/admin/backups');
  });
});

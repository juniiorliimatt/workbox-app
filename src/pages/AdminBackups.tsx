import { FC, FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  FormControlLabel,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Backup as BackupIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import axios from 'axios';
import api from '@/services/api';
import AppNavbar from '@/components/AppNavbar';
import ConfirmDialog from '@/components/ConfirmDialog';
import { IBackupInfo, IBackupRequest } from '@/interfaces/IBackupInfo';
import { useAuth } from '@/hooks/useAuth';
import { formatBytes } from '@/utils/format';

// Espelha o mínimo do backend (backup.min-passphrase-length); lá é que vale, aqui é só UX.
const MIN_PASSPHRASE_LENGTH = 12;
const BASE = '/api/v1/backups';

const formatWhen = (iso: string): string => new Date(iso).toLocaleString('pt-BR');

export const AdminBackups: FC = () => {
  const { accessToken } = useAuth();
  const [backups, setBackups] = useState<IBackupInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [encrypt, setEncrypt] = useState<boolean>(false);
  const [passphrase, setPassphrase] = useState<string>('');
  const [confirmation, setConfirmation] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<IBackupInfo | null>(null);

  const authConfig = useCallback(
    () => ({ headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined }),
    [accessToken]
  );

  const errorMessage = (err: unknown, fallback: string): string =>
    axios.isAxiosError(err) ? err.response?.data?.detail || fallback : fallback;

  const fetchBackups = useCallback(async () => {
    setIsLoading(true);
    setFeedbackError(null);
    try {
      const response = await api.get<IBackupInfo[]>(BASE, authConfig());
      setBackups(response.data || []);
    } catch (err: unknown) {
      setFeedbackError(errorMessage(err, 'Falha ao carregar os backups.'));
    } finally {
      setIsLoading(false);
    }
  }, [authConfig]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleGenerate = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFeedbackSuccess(null);
    setFeedbackError(null);

    const body: IBackupRequest = {};
    if (encrypt) {
      if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
        setFormError(`A senha de cifra deve ter pelo menos ${MIN_PASSPHRASE_LENGTH} caracteres.`);
        return;
      }
      if (passphrase !== confirmation) {
        setFormError('A confirmação não confere com a senha.');
        return;
      }
      body.passphrase = passphrase;
      body.passphraseConfirmation = confirmation;
    }

    setIsGenerating(true);
    try {
      const response = await api.post<IBackupInfo>(BASE, body, authConfig());
      const created = response.data;
      setFeedbackSuccess(
        `Backup gerado${created.encrypted ? ' e cifrado' : ''}: ${created.path}. ` +
          (created.encrypted ? 'Sem a senha não há como abri-lo — guarde-a.' : 'Contém dados sensíveis: guarde em lugar seguro.')
      );
      // A senha não fica na tela nem em estado depois de usada.
      setPassphrase('');
      setConfirmation('');
      await fetchBackups();
    } catch (err: unknown) {
      setFeedbackError(errorMessage(err, 'Falha ao gerar o backup.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (backup: IBackupInfo) => {
    setFeedbackError(null);
    try {
      const response = await api.get<Blob>(`${BASE}/${backup.id}/download`, { ...authConfig(), responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = backup.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setFeedbackError(errorMessage(err, `Falha ao baixar ${backup.fileName}.`));
    }
  };

  const handleDelete = async () => {
    const backup = toDelete;
    setToDelete(null);
    if (!backup) return;
    setFeedbackSuccess(null);
    setFeedbackError(null);
    try {
      await api.delete(`${BASE}/${backup.id}`, authConfig());
      setFeedbackSuccess(`Backup ${backup.fileName} excluído.`);
      await fetchBackups();
    } catch (err: unknown) {
      setFeedbackError(errorMessage(err, `Falha ao excluir ${backup.fileName}.`));
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar
        title="Backup do banco"
        icon={<BackupIcon sx={{ mr: 0.5 }} />}
        showBackButton
        backPath="/admin"
        backLabel="Voltar ao Painel Admin"
      />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ maxWidth: 760 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Backups do banco de dados
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Gera uma cópia completa do Postgres (todos os módulos) na pasta de backups do servidor e mostra onde o arquivo ficou.
                Baixe uma cópia para fora do servidor: backup só no mesmo disco do banco não protege contra perda do disco. O arquivo contém
                dados sensíveis (hashes de senha, segredos de MFA). A restauração <strong>não é feita por aqui</strong>: use{' '}
                <code>scripts/restore-db.sh</code> (para arquivo cifrado, <code>scripts/decrypt-backup.sh</code> antes).
              </Typography>
            </Box>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchBackups} disabled={isLoading || isGenerating}>
              Atualizar
            </Button>
          </Box>

          <Box component="form" onSubmit={handleGenerate} noValidate sx={{ mt: 3 }}>
            <FormControlLabel
              control={<Checkbox checked={encrypt} onChange={(e) => setEncrypt(e.target.checked)} disabled={isGenerating} />}
              label="Cifrar com senha"
            />
            {encrypt && (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', my: 1 }}>
                <TextField
                  label="Senha de cifra"
                  type="password"
                  size="small"
                  autoComplete="new-password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  disabled={isGenerating}
                  helperText={`Mínimo de ${MIN_PASSPHRASE_LENGTH} caracteres. Não é guardada: sem ela o backup não abre.`}
                  sx={{ minWidth: 280 }}
                />
                <TextField
                  label="Confirmar senha"
                  type="password"
                  size="small"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  disabled={isGenerating}
                  sx={{ minWidth: 280 }}
                />
              </Box>
            )}
            {formError && (
              <Alert severity="warning" sx={{ my: 1 }}>
                {formError}
              </Alert>
            )}
            <Box sx={{ mt: 1 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={isGenerating ? <CircularProgress size={18} color="inherit" /> : <BackupIcon />}
                disabled={isGenerating}
              >
                {isGenerating ? 'Gerando…' : 'Gerar backup agora'}
              </Button>
            </Box>
          </Box>
        </Paper>

        {feedbackSuccess && (
          <Alert severity="success" role="status" sx={{ mb: 2 }} onClose={() => setFeedbackSuccess(null)}>
            {feedbackSuccess}
          </Alert>
        )}

        {feedbackError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFeedbackError(null)}>
            {feedbackError}
          </Alert>
        )}

        <Card elevation={2} sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2 }}>
            {isLoading && backups.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
                <Table id="tabela-backups" aria-label="Tabela de backups">
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Arquivo e caminho no servidor</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Gerado em</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Tamanho</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Por</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>SHA-256</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {backups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                          Nenhum backup gerado ainda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      backups.map((backup) => (
                        <TableRow key={backup.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography sx={{ fontWeight: 600 }}>{backup.fileName}</Typography>
                              {backup.encrypted && <Chip icon={<LockIcon />} label="Cifrado" size="small" color="primary" />}
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              {backup.path}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatWhen(backup.createdAt)}</TableCell>
                          <TableCell>{formatBytes(backup.sizeBytes)}</TableCell>
                          <TableCell>{backup.createdBy ?? '—'}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>
                            {backup.sha256 ? (
                              <Tooltip title={backup.sha256}>
                                <span>{`${backup.sha256.slice(0, 12)}…`}</span>
                              </Tooltip>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <Tooltip title="Baixar">
                              <IconButton aria-label={`Baixar ${backup.fileName}`} color="primary" size="small" onClick={() => handleDownload(backup)}>
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <IconButton aria-label={`Excluir ${backup.fileName}`} color="error" size="small" onClick={() => setToDelete(backup)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Container>

      <ConfirmDialog
        open={toDelete !== null}
        title="Excluir backup"
        message={`Excluir ${toDelete?.fileName ?? ''}? O arquivo some do servidor e não dá para desfazer (baixe antes se precisar dele).`}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </Box>
  );
};

export default AdminBackups;

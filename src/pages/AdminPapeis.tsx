import { FC, useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import axios from 'axios';
import api from '@/services/api';
import AppNavbar from '@/components/AppNavbar';
import { IRoleDTO } from '@/interfaces/IRoleDTO';
import { IRoleRevisionDTO } from '@/interfaces/IRoleRevisionDTO';
import { useAuth } from '@/hooks/useAuth';

export const AdminPapeis: FC = () => {
  const { accessToken } = useAuth();
  const [roles, setRoles] = useState<IRoleDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<IRoleDTO | null>(null);
  const [formAuthority, setFormAuthority] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Delete State
  const [roleToDelete, setRoleToDelete] = useState<IRoleDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Audit State
  const [roleForAudit, setRoleForAudit] = useState<IRoleDTO | null>(null);
  const [roleAuditHistory, setRoleAuditHistory] = useState<IRoleRevisionDTO[]>([]);
  const [isLoadingRoleAudit, setIsLoadingRoleAudit] = useState<boolean>(false);
  const [roleAuditError, setRoleAuditError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    setFeedbackError(null);
    try {
      const response = await api.get<IRoleDTO[]>('/api/v1/role', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      setRoles(response.data || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFeedbackError(err.response?.data?.detail || 'Falha ao carregar papéis do sistema.');
      } else {
        setFeedbackError('Erro ao consultar papéis.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleOpenCreateDialog = () => {
    setIsEditing(false);
    setSelectedRole(null);
    setFormAuthority('');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (role: IRoleDTO) => {
    setIsEditing(true);
    setSelectedRole(role);
    setFormAuthority(role.authority);
    setIsDialogOpen(true);
  };

  const handleOpenRoleAudit = async (role: IRoleDTO) => {
    if (role.id === undefined || role.id === null) return;
    setRoleForAudit(role);
    setIsLoadingRoleAudit(true);
    setRoleAuditError(null);
    setRoleAuditHistory([]);

    try {
      const response = await api.get<IRoleRevisionDTO[]>(
        `/api/v1/audit/roles/${role.id}/history`,
        {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        }
      );
      setRoleAuditHistory(response.data || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 403) {
          setRoleAuditError('Acesso negado: apenas administradores podem consultar auditoria.');
        } else {
          setRoleAuditError(err.response?.data?.detail || 'Falha ao buscar histórico de auditoria do papel.');
        }
      } else {
        setRoleAuditError('Erro inesperado ao consultar auditoria do papel.');
      }
    } finally {
      setIsLoadingRoleAudit(false);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = formAuthority.trim().toUpperCase();
    if (!formatted) {
      setFeedbackError('Informe o nome da autoridade (ex: MANAGER, AUDITOR).');
      return;
    }

    setIsSubmitting(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      if (isEditing && selectedRole?.id) {
        await api.put(
          `/api/v1/role/${selectedRole.id}`,
          {
            id: selectedRole.id,
            authority: formatted,
          },
          {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          }
        );
        setFeedbackSuccess(`Papel "${formatted}" atualizado com sucesso!`);
      } else {
        await api.post(
          '/api/v1/role',
          {
            authority: formatted,
          },
          {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          }
        );
        setFeedbackSuccess(`Papel "${formatted}" criado com sucesso!`);
      }

      setIsDialogOpen(false);
      fetchRoles();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFeedbackError(err.response?.data?.detail || 'Falha ao salvar papel.');
      } else {
        setFeedbackError('Erro inesperado ao salvar papel.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete?.id) return;
    setIsDeleting(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      await api.delete(`/api/v1/role/${roleToDelete.id}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      setFeedbackSuccess(`Papel "${roleToDelete.authority}" removido com sucesso.`);
      setRoleToDelete(null);
      fetchRoles();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFeedbackError(err.response?.data?.detail || 'Falha ao excluir papel.');
      } else {
        setFeedbackError('Erro ao excluir papel.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const getRevisionTypeChip = (type: string) => {
    switch (type) {
      case 'ADD':
        return <Chip label="Criação (ADD)" color="success" size="small" />;
      case 'MOD':
        return <Chip label="Alteração (MOD)" color="primary" size="small" />;
      case 'DEL':
        return <Chip label="Exclusão (DEL)" color="error" size="small" />;
      default:
        return <Chip label={type} size="small" />;
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar
        title="Papéis & Permissões"
        icon={<SecurityIcon sx={{ mr: 0.5 }} />}
        showBackButton
        backPath="/admin"
        backLabel="Voltar ao Painel Admin"
      />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Governança de Perfis & Roles
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configuração de autoridades de segurança e níveis de acesso (RBAC - Role-Based Access Control).
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchRoles}
                disabled={isLoading}
              >
                Atualizar
              </Button>
              <Button
                id="btn-novo-papel"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateDialog}
              >
                Novo Papel
              </Button>
            </Box>
          </Box>
        </Paper>

        {feedbackSuccess && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setFeedbackSuccess(null)}>
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
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
                <Table id="tabela-papeis" aria-label="Tabela de Papéis">
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: 100 }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Autoridade / Identificador (Authority)</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                          Nenhum papel cadastrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      roles.map((role) => (
                        <TableRow key={role.id || role.authority} hover>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{role.id ?? '-'}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{role.authority}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            <Tooltip title="Histórico de Auditoria">
                              <IconButton
                                aria-label="Auditoria do papel"
                                color="info"
                                size="small"
                                onClick={() => handleOpenRoleAudit(role)}
                              >
                                <HistoryIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar papel">
                              <IconButton
                                aria-label="Editar papel"
                                color="primary"
                                size="small"
                                onClick={() => handleOpenEditDialog(role)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip
                              title={
                                role.authority === 'ADMIN' ||
                                role.authority === 'USER' ||
                                role.authority === 'ROLE_ADMIN' ||
                                role.authority === 'ROLE_USER'
                                  ? 'Papéis base do sistema não podem ser excluídos'
                                  : 'Excluir papel'
                              }
                            >
                              <span>
                                <IconButton
                                  aria-label="Excluir papel"
                                  color="error"
                                  size="small"
                                  onClick={() => setRoleToDelete(role)}
                                  disabled={
                                    role.authority === 'ADMIN' ||
                                    role.authority === 'USER' ||
                                    role.authority === 'ROLE_ADMIN' ||
                                    role.authority === 'ROLE_USER'
                                  }
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
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

      {/* Dialog de Criação / Edição de Papel */}
      <Dialog
        open={isDialogOpen}
        onClose={() => !isSubmitting && setIsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box component="form" onSubmit={handleSaveRole}>
          <DialogTitle sx={{ fontWeight: 600 }}>
            {isEditing ? `Editar Papel #${selectedRole?.id}` : 'Criar Novo Papel'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Informe o identificador da autoridade do papel (ex: <code>MANAGER</code>, <code>AUDITOR</code>).
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              label="Nome da Autoridade (ex: MANAGER)"
              placeholder="ex: MANAGER"
              fullWidth
              required
              id="role-authority-input"
              value={formAuthority}
              onChange={(e) => setFormAuthority(e.target.value.toUpperCase())}
              disabled={isSubmitting}
              helperText="Identificador do papel (ex: MANAGER, AUDITOR). O prefixo ROLE_ é adicionado automaticamente pelo token JWT."
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              id="btn-salvar-papel"
            >
              {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Dialog de Exclusão de Papel */}
      <Dialog
        open={Boolean(roleToDelete)}
        onClose={() => !isDeleting && setRoleToDelete(null)}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Confirmar Exclusão de Papel</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza de que deseja excluir o papel <strong>{roleToDelete?.authority}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRoleToDelete(null)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            id="btn-confirmar-exclusao-papel"
          >
            {isDeleting ? <CircularProgress size={20} color="inherit" /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Histórico de Auditoria do Papel */}
      <Dialog
        open={Boolean(roleForAudit)}
        onClose={() => setRoleForAudit(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" />
          Histórico de Auditoria: {roleForAudit?.authority}
        </DialogTitle>
        <DialogContent dividers>
          {roleAuditError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {roleAuditError}
            </Alert>
          )}

          {isLoadingRoleAudit ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress size={32} />
            </Box>
          ) : roleAuditHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              Nenhum registro de auditoria Envers encontrado para este papel.
            </Typography>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
              <Table size="small" aria-label="Tabela de Revisões do Papel">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Rev. #</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Data & Hora</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Responsável</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Autoridade</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roleAuditHistory.map((rev) => (
                    <TableRow key={rev.revision} hover>
                      <TableCell sx={{ fontWeight: 600 }}>#{rev.revision}</TableCell>
                      <TableCell>{getRevisionTypeChip(rev.revisionType)}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {rev.changedAt ? new Date(rev.changedAt).toLocaleString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{rev.changedBy || 'Sistema'}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{rev.authority}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRoleForAudit(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPapeis;

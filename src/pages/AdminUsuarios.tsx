import { FC, useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Avatar,
  Badge,
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
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  Paper,
  Switch,
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
  Person as PersonIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  PhotoCamera as PhotoCameraIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import axios from 'axios';
import api from '@/services/api';
import UserAvatar from '@/components/UserAvatar';
import AppNavbar from '@/components/AppNavbar';
import { IUserAdminDTO } from '@/interfaces/IUserAdminDTO';
import { IRoleDTO } from '@/interfaces/IRoleDTO';
import { IUserApiRevisionDTO } from '@/interfaces/IUserApiRevisionDTO';
import { useAuth } from '@/hooks/useAuth';

export const AdminUsuarios: FC = () => {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<IUserAdminDTO[]>([]);
  const [roles, setRoles] = useState<IRoleDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Dialog de Edição / Criação
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<IUserAdminDTO | null>(null);

  // Form State
  const [formSocialName, setFormSocialName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formIsEnabled, setFormIsEnabled] = useState<boolean>(true);
  const [formRoles, setFormRoles] = useState<string[]>([]);
  const [formAvatarPreview, setFormAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Dialog de Exclusão
  const [userToDelete, setUserToDelete] = useState<IUserAdminDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Dialog de Auditoria de Usuário
  const [userForAudit, setUserForAudit] = useState<IUserAdminDTO | null>(null);
  const [userAuditHistory, setUserAuditHistory] = useState<IUserApiRevisionDTO[]>([]);
  const [isLoadingUserAudit, setIsLoadingUserAudit] = useState<boolean>(false);
  const [userAuditError, setUserAuditError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setFeedbackError(null);
    try {
      const response = await api.get<{ _embedded?: { userApiDTOList?: IUserAdminDTO[] } }>(
        '/api/v1/user/find-all',
        {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        }
      );
      const userList = response.data?._embedded?.userApiDTOList || [];
      setUsers(userList);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFeedbackError(err.response?.data?.detail || 'Falha ao carregar lista de usuários.');
      } else {
        setFeedbackError('Erro inesperado ao buscar usuários.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await api.get<IRoleDTO[]>('/api/v1/role', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      setRoles(response.data || []);
    } catch {
      // Falha silenciosa de papéis
    }
  }, [accessToken]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const handleOpenCreateDialog = () => {
    setIsEditing(false);
    setSelectedUser(null);
    setFormSocialName('');
    setFormEmail('');
    setFormPassword('');
    setFormIsEnabled(true);
    const defaultRole = roles.find((r) => r.authority === 'USER' || r.authority === 'ROLE_USER')?.authority || 'USER';
    setFormRoles([defaultRole]);
    setFormAvatarPreview(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (user: IUserAdminDTO) => {
    setIsEditing(true);
    setSelectedUser(user);
    setFormSocialName(user.socialName || '');
    setFormEmail(user.email || '');
    setFormPassword('');
    setFormIsEnabled(user.enabled !== undefined ? user.enabled : user.isEnabled ?? true);
    const defaultRole = roles.find((r) => r.authority === 'USER' || r.authority === 'ROLE_USER')?.authority || 'USER';
    setFormRoles(user.roles && user.roles.length > 0 ? user.roles.map((r) => r.authority) : [defaultRole]);
    setFormAvatarPreview(user.avatarUrl || null);
    setIsDialogOpen(true);
  };

  const handleOpenUserAudit = async (user: IUserAdminDTO) => {
    if (!user.id) return;
    setUserForAudit(user);
    setIsLoadingUserAudit(true);
    setUserAuditError(null);
    setUserAuditHistory([]);

    try {
      const response = await api.get<IUserApiRevisionDTO[]>(
        `/api/v1/audit/users/${user.id}/history`,
        {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        }
      );
      setUserAuditHistory(response.data || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 403) {
          setUserAuditError('Acesso negado: apenas administradores podem consultar auditoria.');
        } else {
          setUserAuditError(err.response?.data?.detail || 'Falha ao buscar histórico de auditoria do usuário.');
        }
      } else {
        setUserAuditError('Erro inesperado ao consultar auditoria.');
      }
    } finally {
      setIsLoadingUserAudit(false);
    }
  };

  const handleFormAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSocialName.trim() || !formEmail.trim()) {
      setFeedbackError('Nome social e e-mail são obrigatórios.');
      return;
    }

    if (!isEditing && !formPassword.trim()) {
      setFeedbackError('Senha é obrigatória para cadastro de novos usuários.');
      return;
    }

    setIsSubmitting(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      const selectedRoleObjects = formRoles.map((authority) => {
        const found = roles.find((r) => r.authority === authority);
        return {
          id: found?.id || (authority.toUpperCase().includes('ADMIN') ? 1 : 2),
          authority: found?.authority || authority,
        };
      });

      if (isEditing && selectedUser?.id) {
        await api.put(
          '/api/v1/user/update',
          {
            id: selectedUser.id,
            socialName: formSocialName.trim(),
            email: formEmail.trim(),
            password: formPassword.trim() || undefined,
            isEnabled: formIsEnabled,
            roles: selectedRoleObjects,
          },
          {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          }
        );
        setFeedbackSuccess(`Usuário "${formSocialName}" atualizado com sucesso!`);
      } else {
        await api.post(
          '/api/v1/user/save',
          {
            socialName: formSocialName.trim(),
            email: formEmail.trim(),
            password: formPassword.trim(),
            isEnabled: formIsEnabled,
            roles: selectedRoleObjects,
          },
          {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          }
        );
        setFeedbackSuccess(`Usuário "${formSocialName}" cadastrado com sucesso!`);
      }

      setIsDialogOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFeedbackError(err.response?.data?.detail || 'Falha ao salvar dados do usuário.');
      } else {
        setFeedbackError('Erro inesperado ao salvar usuário.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete?.id) return;
    setIsDeleting(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      await api.delete(`/api/v1/user/${userToDelete.id}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      setFeedbackSuccess(`Usuário "${userToDelete.socialName}" excluído com sucesso.`);
      setUserToDelete(null);
      fetchUsers();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFeedbackError(err.response?.data?.detail || 'Falha ao excluir usuário.');
      } else {
        setFeedbackError('Erro inesperado ao excluir usuário.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchQuery.toLowerCase();
    const nameMatch = u.socialName ? u.socialName.toLowerCase().includes(term) : false;
    const emailMatch = u.email ? u.email.toLowerCase().includes(term) : false;
    return nameMatch || emailMatch;
  });

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
        title="Gestão de Usuários"
        icon={<PersonIcon sx={{ mr: 0.5 }} />}
        showBackButton
        backPath="/admin"
        backLabel="Voltar ao Painel Admin"
      />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Usuários do Sistema
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerencie contas, credenciais, papéis de acesso e consulte a trilha de auditoria completa.
              </Typography>
            </Box>
            <Button
              id="btn-novo-usuario"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
              sx={{ textTransform: 'none' }}
            >
              Novo Usuário
            </Button>
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
              <TextField
                size="small"
                placeholder="Pesquisar por nome social ou e-mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ maxWidth: 400, flexGrow: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <IconButton onClick={fetchUsers} disabled={isLoading} title="Recarregar lista">
                <RefreshIcon />
              </IconButton>
            </Box>

            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
                <Table id="tabela-usuarios" aria-label="Tabela de usuários">
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Usuário</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>E-mail</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Papéis</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                          Nenhum usuário encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => {
                        const isUserActive = user.enabled !== undefined ? user.enabled : user.isEnabled ?? true;
                        return (
                          <TableRow key={user.id || user.email} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <UserAvatar
                                  avatarUrl={user.avatarUrl}
                                  name={user.socialName}
                                  sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.9rem' }}
                                />
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {user.socialName || 'Sem nome social'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Chip
                                label={isUserActive ? 'Ativo' : 'Inativo'}
                                color={isUserActive ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {user.roles && user.roles.length > 0 ? (
                                    user.roles.map((r) => (
                                      <Chip
                                        key={r.authority || r.id}
                                        label={r.authority}
                                        size="small"
                                        variant="outlined"
                                        color={r.authority.toUpperCase().includes('ADMIN') ? 'primary' : 'default'}
                                      />
                                    ))
                                  ) : (
                                    <Chip label="USER" size="small" variant="outlined" />
                                  )}
                                </Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>
                              <Tooltip title="Histórico de Auditoria">
                                <IconButton
                                  aria-label="Auditoria do usuário"
                                  color="info"
                                  size="small"
                                  onClick={() => handleOpenUserAudit(user)}
                                >
                                  <HistoryIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Editar usuário">
                                <IconButton
                                  aria-label="Editar usuário"
                                  color="primary"
                                  size="small"
                                  onClick={() => handleOpenEditDialog(user)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Excluir usuário">
                                <IconButton
                                  aria-label="Excluir usuário"
                                  color="error"
                                  size="small"
                                  onClick={() => setUserToDelete(user)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Container>

      {/* Dialog de Criação / Edição de Usuário */}
      <Dialog
        open={isDialogOpen}
        onClose={() => !isSubmitting && setIsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box component="form" onSubmit={handleSaveUser}>
          <DialogTitle sx={{ fontWeight: 600 }}>
            {isEditing ? `Editar Informações de "${selectedUser?.socialName}"` : 'Cadastrar Novo Usuário'}
          </DialogTitle>
          <DialogContent dividers>
            {/* Foto de Perfil no Cadastro/Edição de Usuário */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <label htmlFor="admin-avatar-file-input">
                    <IconButton
                      component="span"
                      size="small"
                      sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, p: 0.5 }}
                    >
                      <PhotoCameraIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </label>
                }
              >
                <Avatar
                  src={formAvatarPreview || undefined}
                  sx={{ width: 52, height: 52, bgcolor: 'secondary.main' }}
                >
                  {!formAvatarPreview && <PersonIcon />}
                </Avatar>
              </Badge>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Foto do Usuário
                </Typography>
                <input
                  id="admin-avatar-file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFormAvatarFile}
                  disabled={isSubmitting}
                />
                <label htmlFor="admin-avatar-file-input">
                  <Button variant="text" component="span" size="small" sx={{ p: 0, textTransform: 'none' }}>
                    {formAvatarPreview ? 'Alterar Imagem' : 'Selecionar Imagem'}
                  </Button>
                </label>
              </Box>
            </Box>

            <TextField
              margin="dense"
              required
              fullWidth
              label="Nome Social / Como quer ser chamado"
              id="admin-form-social-name"
              value={formSocialName}
              onChange={(e) => setFormSocialName(e.target.value)}
              disabled={isSubmitting}
              sx={{ mb: 1.5 }}
            />

            <TextField
              margin="dense"
              required
              fullWidth
              label="Endereço de E-mail"
              type="email"
              id="admin-form-email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              disabled={isSubmitting}
              sx={{ mb: 1.5 }}
            />

            <TextField
              margin="dense"
              fullWidth
              label={isEditing ? 'Nova Senha (deixe em branco para manter)' : 'Senha Inicial'}
              type="password"
              id="admin-form-password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              disabled={isSubmitting}
              required={!isEditing}
              sx={{ mb: 1.5 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formIsEnabled}
                  onChange={(e) => setFormIsEnabled(e.target.checked)}
                  color="primary"
                  disabled={isSubmitting}
                />
              }
              label={formIsEnabled ? 'Conta Habilitada / Ativa' : 'Conta Desabilitada'}
              sx={{ mb: 2, display: 'block' }}
            />

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Papéis & Permissões:
            </Typography>
            <FormControl component="fieldset">
              <FormGroup row>
                {roles.map((role) => {
                  const isChecked = formRoles.includes(role.authority);
                  return (
                    <FormControlLabel
                      key={role.id || role.authority}
                      control={
                        <Switch
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormRoles([...formRoles, role.authority]);
                            } else {
                              setFormRoles(formRoles.filter((r) => r !== role.authority));
                            }
                          }}
                          size="small"
                        />
                      }
                      label={role.authority}
                    />
                  );
                })}
              </FormGroup>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              id="btn-salvar-usuario-admin"
            >
              {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog
        open={Boolean(userToDelete)}
        onClose={() => !isDeleting && setUserToDelete(null)}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Confirmar Exclusão de Usuário</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza de que deseja excluir o usuário <strong>{userToDelete?.socialName}</strong> ({userToDelete?.email})?
            Esta ação realizará a exclusão lógica da conta no sistema.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUserToDelete(null)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            id="btn-confirmar-exclusao"
          >
            {isDeleting ? <CircularProgress size={20} color="inherit" /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Histórico de Auditoria do Usuário */}
      <Dialog
        open={Boolean(userForAudit)}
        onClose={() => setUserForAudit(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" />
          Histórico de Auditoria: {userForAudit?.socialName || userForAudit?.email}
        </DialogTitle>
        <DialogContent dividers>
          {userAuditError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {userAuditError}
            </Alert>
          )}

          {isLoadingUserAudit ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress size={32} />
            </Box>
          ) : userAuditHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              Nenhum registro de auditoria Envers encontrado para este usuário.
            </Typography>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
              <Table size="small" aria-label="Tabela de Revisões do Usuário">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Rev. #</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Data & Hora</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Responsável</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Nome Social</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>E-mail</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>MFA</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userAuditHistory.map((rev) => (
                    <TableRow key={rev.revision} hover>
                      <TableCell sx={{ fontWeight: 600 }}>#{rev.revision}</TableCell>
                      <TableCell>{getRevisionTypeChip(rev.revisionType)}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {rev.changedAt ? new Date(rev.changedAt).toLocaleString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{rev.changedBy || 'Sistema'}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{rev.socialName || '-'}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{rev.email || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={rev.enabled ? 'Ativo' : 'Inativo'}
                          color={rev.enabled ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={rev.mfaEnabled ? 'Ativo' : 'Desativado'}
                          color={rev.mfaEnabled ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUserForAudit(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsuarios;

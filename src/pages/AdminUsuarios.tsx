import { FC, useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Avatar,
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
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import axios from 'axios';
import api from '@/services/api';
import AppNavbar from '@/components/AppNavbar';
import { IUserAdminDTO } from '@/interfaces/IUserAdminDTO';
import { IRoleDTO } from '@/interfaces/IRoleDTO';
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
  const [formRoles, setFormRoles] = useState<string[]>(['ROLE_USER']);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Dialog de Confirmação de Exclusão
  const [userToDelete, setUserToDelete] = useState<IUserAdminDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await api.get<IRoleDTO[]>('/api/v1/role', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      setRoles(response.data || []);
    } catch {
      // Fallback para roles padrão se requisição falhar
      setRoles([{ id: 1, authority: 'ROLE_ADMIN' }, { id: 2, authority: 'ROLE_USER' }]);
    }
  }, [accessToken]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setFeedbackError(null);
    try {
      const response = await api.get<{ _embedded?: { userApiDTOList?: IUserAdminDTO[] }; content?: IUserAdminDTO[] }>('/api/v1/user/find-all', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      let list: IUserAdminDTO[] = [];
      if (Array.isArray(response.data)) {
        list = response.data;
      } else if (response.data?._embedded?.userApiDTOList) {
        list = response.data._embedded.userApiDTOList;
      } else if (Array.isArray(response.data?.content)) {
        list = response.data.content;
      }
      setUsers(list);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFeedbackError(err.response?.data?.detail || 'Falha ao carregar lista de usuários.');
      } else {
        setFeedbackError('Erro inesperado ao carregar usuários.');
      }
    } finally {
      setIsLoading(false);
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
    setFormRoles(['ROLE_USER']);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (user: IUserAdminDTO) => {
    setIsEditing(true);
    setSelectedUser(user);
    setFormSocialName(user.socialName || '');
    setFormEmail(user.email || '');
    setFormPassword('');
    setFormIsEnabled(user.enabled !== undefined ? user.enabled : user.isEnabled ?? true);
    setFormRoles(user.roles ? user.roles.map((r) => r.authority) : ['ROLE_USER']);
    setIsDialogOpen(true);
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
          id: found?.id || (authority === 'ROLE_ADMIN' ? 1 : 2),
          authority,
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
      setFeedbackSuccess(`Usuário "${userToDelete.socialName}" desativado/removido com sucesso.`);
      setUserToDelete(null);
      fetchUsers();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFeedbackError(err.response?.data?.detail || 'Falha ao excluir usuário.');
      } else {
        setFeedbackError('Erro ao excluir usuário.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchQuery.toLowerCase();
    return (
      (u.socialName && u.socialName.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term))
    );
  });

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
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Controle de Contas & Usuários
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerenciamento central de credenciais, papéis, dados cadastrais e status de ativação.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchUsers}
                disabled={isLoading}
              >
                Atualizar
              </Button>
              <Button
                id="btn-novo-usuario"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateDialog}
              >
                Novo Usuário
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
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por nome social ou e-mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
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
                                <Avatar
                                  src={user.avatarUrl || undefined}
                                  sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}
                                >
                                  {!user.avatarUrl && <PersonIcon />}
                                </Avatar>
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
                                      color={r.authority === 'ROLE_ADMIN' ? 'primary' : 'default'}
                                    />
                                  ))
                                ) : (
                                  <Chip label="ROLE_USER" size="small" variant="outlined" />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>
                              <IconButton
                                aria-label="Editar usuário"
                                color="primary"
                                size="small"
                                onClick={() => handleOpenEditDialog(user)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                aria-label="Excluir usuário"
                                color="error"
                                size="small"
                                onClick={() => setUserToDelete(user)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
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
    </Box>
  );
};

export default AdminUsuarios;

import { FC, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { AccountTree as ModulesIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import axios from 'axios';
import api from '@/services/api';
import AppNavbar from '@/components/AppNavbar';
import { IModuleDTO } from '@/interfaces/IModuleDTO';
import { IRoleDTO } from '@/interfaces/IRoleDTO';
import { useAuth } from '@/hooks/useAuth';

// ADMIN já acessa tudo e USER é só a role inicial de todo cadastro — o backend recusa o
// vínculo dessas duas (400), então nem as listamos.
const SYSTEM_ROLES = ['ADMIN', 'USER', 'ROLE_ADMIN', 'ROLE_USER'];
const NO_MODULE = '';

export const AdminModulos: FC = () => {
  const { accessToken } = useAuth();
  const [roles, setRoles] = useState<IRoleDTO[]>([]);
  const [modules, setModules] = useState<IModuleDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savingRoleId, setSavingRoleId] = useState<number | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const authConfig = useCallback(
    () => ({ headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined }),
    [accessToken]
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setFeedbackError(null);
    try {
      const [rolesResponse, modulesResponse] = await Promise.all([
        api.get<IRoleDTO[]>('/api/v1/role', authConfig()),
        api.get<IModuleDTO[]>('/api/v1/module', authConfig()),
      ]);
      setRoles((rolesResponse.data || []).filter((role) => !SYSTEM_ROLES.includes(role.authority)));
      setModules(modulesResponse.data || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFeedbackError(err.response?.data?.detail || 'Falha ao carregar papéis e módulos.');
      } else {
        setFeedbackError('Erro ao consultar papéis e módulos.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [authConfig]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChangeModule = async (role: IRoleDTO, value: string) => {
    if (role.id === undefined || role.id === null) return;
    const moduleId = value === NO_MODULE ? null : Number(value);
    setSavingRoleId(role.id);
    setFeedbackSuccess(null);
    setFeedbackError(null);
    try {
      const response = await api.put<IRoleDTO>(`/api/v1/role/${role.id}/module`, { moduleId }, authConfig());
      const updated = response.data;
      setRoles((current) => current.map((item) => (item.id === role.id ? { ...item, module: updated.module ?? null } : item)));
      setFeedbackSuccess(
        updated.module
          ? `Papel ${role.authority} vinculado ao módulo ${updated.module.name}. O acesso vale na próxima ação do usuário.`
          : `Papel ${role.authority} desvinculado de módulo.`
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFeedbackError(err.response?.data?.detail || `Falha ao vincular o papel ${role.authority}.`);
      } else {
        setFeedbackError(`Erro inesperado ao vincular o papel ${role.authority}.`);
      }
    } finally {
      setSavingRoleId(null);
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar
        title="Papéis × Módulos"
        icon={<ModulesIcon sx={{ mr: 0.5 }} />}
        showBackButton
        backPath="/admin"
        backLabel="Voltar ao Painel Admin"
      />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Acesso aos Módulos por Papel
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cada papel libera um módulo. Quem cria a conta começa só com USER, sem nenhum módulo: dê ao usuário o papel
                do módulo em Gestão de Usuários. ADMIN acessa todos.
              </Typography>
            </Box>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchData} disabled={isLoading}>
              Atualizar
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
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
                <Table id="tabela-papeis-modulos" aria-label="Tabela de Papéis e Módulos">
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Papel (Authority)</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 320 }}>Módulo liberado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                          Nenhum papel de módulo cadastrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      roles.map((role) => (
                        <TableRow key={role.id ?? role.authority} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{role.authority}</TableCell>
                          <TableCell>
                            <Select
                              size="small"
                              fullWidth
                              displayEmpty
                              value={role.module ? String(role.module.id) : NO_MODULE}
                              disabled={savingRoleId === role.id}
                              onChange={(event) => handleChangeModule(role, String(event.target.value))}
                              SelectDisplayProps={{ 'aria-label': `Módulo do papel ${role.authority}` }}
                            >
                              <MenuItem value={NO_MODULE}>Sem módulo</MenuItem>
                              {modules.map((module) => (
                                <MenuItem key={module.id} value={String(module.id)}>
                                  {module.name}
                                </MenuItem>
                              ))}
                            </Select>
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
    </Box>
  );
};

export default AdminModulos;

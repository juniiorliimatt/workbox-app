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
  Grid,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  History as HistoryIcon,
  Search as SearchIcon,
  CheckCircle as SuccessIcon,
  Cancel as FailureIcon,
  VpnKey as MfaIcon,
  Shield as ShieldIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import axios from 'axios';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import AppNavbar from '@/components/AppNavbar';
import { ILoginAuditDTO } from '@/interfaces/ILoginAuditDTO';
import { IPageResponse } from '@/interfaces/IPageResponse';

export const AdminAuditoria: FC = () => {
  const { accessToken } = useAuth();

  const [logs, setLogs] = useState<ILoginAuditDTO[]>([]);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Filtros
  const [filterEmail, setFilterEmail] = useState<string>('');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');

  const fetchLoginAudits = useCallback(async () => {
    setIsLoading(true);
    setFeedbackError(null);
    try {
      const params: Record<string, string | number> = {
        page,
        size: rowsPerPage,
        sort: 'createdAt,desc',
      };

      if (filterEmail.trim()) {
        params.email = filterEmail.trim();
      }
      if (filterFrom.trim()) {
        params.from = filterFrom.includes('T') ? filterFrom : `${filterFrom}T00:00:00`;
      }
      if (filterTo.trim()) {
        params.to = filterTo.includes('T') ? filterTo : `${filterTo}T23:59:59`;
      }

      const response = await api.get<IPageResponse<ILoginAuditDTO>>('/api/v1/audit/logins', {
        params,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      setLogs(response.data.content || []);
      setTotalElements(response.data.totalElements || 0);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 403) {
          setFeedbackError('Acesso negado: apenas administradores podem visualizar a trilha de auditoria.');
        } else {
          setFeedbackError(err.response?.data?.detail || 'Falha ao carregar registros de auditoria.');
        }
      } else {
        setFeedbackError('Erro inesperado ao carregar auditoria de logins.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, page, rowsPerPage, filterEmail, filterFrom, filterTo]);

  useEffect(() => {
    fetchLoginAudits();
  }, [fetchLoginAudits]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchLoginAudits();
  };

  const handleClearFilters = () => {
    setFilterEmail('');
    setFilterFrom('');
    setFilterTo('');
    setPage(0);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getReasonLabel = (log: ILoginAuditDTO) => {
    if (log.successful) {
      if (log.reason === 'mfa_verified') {
        return 'MFA Validado com Sucesso';
      }
      return 'Autenticação Bem-sucedida';
    }

    if (log.reason === 'mfa_invalid_code') {
      return 'Código TOTP MFA Inválido';
    }
    if (log.reason === 'unknown_user') {
      return 'Usuário Inexistente';
    }
    if (log.reason === 'bad_credentials' || log.reason === 'bad_password') {
      return 'Senha Incorreta';
    }
    if (log.reason === 'account_locked') {
      return 'Conta Temporariamente Bloqueada';
    }
    if (log.reason === 'account_disabled') {
      return 'Conta Desativada';
    }
    return log.reason || 'Falha na Autenticação';
  };

  const successCount = logs.filter((l) => l.successful).length;
  const failureCount = logs.filter((l) => !l.successful).length;
  const mfaCount = logs.filter((l) => l.reason?.includes('mfa')).length;

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar
        title="Auditoria de Logins"
        icon={<HistoryIcon sx={{ mr: 0.5 }} />}
        showBackButton
        backPath="/admin"
        backLabel="Voltar ao Painel Admin"
      />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
            Trilha de Auditoria & Segurança de Acesso
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Rastreamento de tentativas de autenticação em tempo real, endereços IP e eventos de segurança (ADMIN-only).
          </Typography>
        </Paper>

        {feedbackError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setFeedbackError(null)}>
            {feedbackError}
          </Alert>
        )}

        {/* Cards de Métricas da Página Atual / Geral */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ShieldIcon color="primary" sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {totalElements}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total de Tentativas Registradas
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SuccessIcon color="success" sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {successCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sucessos na Página
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FailureIcon color="error" sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {failureCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Falhas na Página
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <MfaIcon color="warning" sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {mfaCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Eventos MFA / 2FA na Página
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filtros e Tabela de Auditoria */}
        <Card elevation={2} sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <Box component="form" onSubmit={handleFilterSubmit} sx={{ mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    id="filter-email"
                    label="Filtrar por E-mail"
                    placeholder="ex.: admin@workbox.local"
                    value={filterEmail}
                    onChange={(e) => setFilterEmail(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2.5}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    id="filter-from"
                    label="Data De"
                    InputLabelProps={{ shrink: true }}
                    value={filterFrom}
                    onChange={(e) => setFilterFrom(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2.5}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    id="filter-to"
                    label="Data Até"
                    InputLabelProps={{ shrink: true }}
                    value={filterTo}
                    onChange={(e) => setFilterTo(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SearchIcon />}
                    sx={{ flexGrow: 1 }}
                  >
                    Filtrar
                  </Button>
                  {(filterEmail || filterFrom || filterTo) && (
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={handleClearFilters}
                      startIcon={<ClearIcon />}
                    >
                      Limpar
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    onClick={fetchLoginAudits}
                    disabled={isLoading}
                    sx={{ minWidth: 40, px: 1.5 }}
                  >
                    {isLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  </Button>
                </Grid>
              </Grid>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
              <Table id="tabela-auditoria" aria-label="Tabela de Auditoria de Logins">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Data & Hora</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Identificador / E-mail</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Endereço IP</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Resultado</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Detalhes / Motivo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                        <CircularProgress size={32} sx={{ mb: 1, display: 'block', mx: 'auto' }} />
                        <Typography variant="body2" color="text.secondary">
                          Carregando trilha de auditoria...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        Nenhum registro de auditoria encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => {
                      const formattedDate = log.createdAt
                        ? new Date(log.createdAt).toLocaleString('pt-BR')
                        : 'Data não informada';

                      return (
                        <TableRow key={log.id || `${log.email}-${log.createdAt}`} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {formattedDate}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{log.email}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{log.ipAddress || '-'}</TableCell>
                          <TableCell>
                            {log.successful ? (
                              <Chip icon={<SuccessIcon />} label="Sucesso" color="success" size="small" />
                            ) : (
                              <Chip icon={<FailureIcon />} label="Falha" color="error" size="small" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                              {getReasonLabel(log)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={totalElements}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Itens por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`}
            />
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default AdminAuditoria;

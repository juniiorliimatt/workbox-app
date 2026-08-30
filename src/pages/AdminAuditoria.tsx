import { FC, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  InputAdornment,
  Paper,
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
  History as HistoryIcon,
  Search as SearchIcon,
  CheckCircle as SuccessIcon,
  Cancel as FailureIcon,
  VpnKey as MfaIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import AppNavbar from '@/components/AppNavbar';

interface IAuditLogEntry {
  id: string;
  email: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILED' | 'MFA_REQUIRED' | 'RATE_LIMITED';
  timestamp: string;
  details: string;
}

const SAMPLE_AUDIT_LOGS: IAuditLogEntry[] = [
  {
    id: '1',
    email: 'admin@workbox.local',
    ipAddress: '127.0.0.1',
    status: 'SUCCESS',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toLocaleString('pt-BR'),
    details: 'Login via credenciais com sucesso (ROLE_ADMIN)',
  },
  {
    id: '2',
    email: 'admin@workbox.local',
    ipAddress: '127.0.0.1',
    status: 'MFA_REQUIRED',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toLocaleString('pt-BR'),
    details: 'Desafio TOTP MFA solicitado',
  },
  {
    id: '3',
    email: 'cliente@workbox.local',
    ipAddress: '192.168.1.45',
    status: 'SUCCESS',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toLocaleString('pt-BR'),
    details: 'Login de usuário padrão (ROLE_USER)',
  },
  {
    id: '4',
    email: 'desconhecido@teste.com',
    ipAddress: '203.0.113.19',
    status: 'FAILED',
    timestamp: new Date(Date.now() - 90 * 60 * 1000).toLocaleString('pt-BR'),
    details: 'Credenciais inválidas fornecidas',
  },
  {
    id: '5',
    email: 'attacker@botnet.org',
    ipAddress: '198.51.100.88',
    status: 'RATE_LIMITED',
    timestamp: new Date(Date.now() - 120 * 60 * 1000).toLocaleString('pt-BR'),
    details: 'Bloqueado por exceder taxa de requisições (LoginRateLimiter)',
  },
];

export const AdminAuditoria: FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = SAMPLE_AUDIT_LOGS.filter((log) => {
    const term = searchQuery.toLowerCase();
    return (
      log.email.toLowerCase().includes(term) ||
      log.ipAddress.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term)
    );
  });

  const getStatusChip = (status: IAuditLogEntry['status']) => {
    switch (status) {
      case 'SUCCESS':
        return <Chip icon={<SuccessIcon />} label="Sucesso" color="success" size="small" />;
      case 'FAILED':
        return <Chip icon={<FailureIcon />} label="Falha" color="error" size="small" />;
      case 'MFA_REQUIRED':
        return <Chip icon={<MfaIcon />} label="MFA 2FA" color="warning" size="small" />;
      case 'RATE_LIMITED':
        return <Chip icon={<ShieldIcon />} label="Bloqueio Rate-Limit" color="default" size="small" sx={{ bgcolor: 'grey.800', color: 'white' }} />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

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
            Rastreamento de tentativas de autenticação, origem de conexões (IP) e eventos Envers.
          </Typography>
        </Paper>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SuccessIcon color="success" sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>98.4%</Typography>
                  <Typography variant="caption" color="text.secondary">Logins Bem-sucedidos</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <MfaIcon color="warning" sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>24</Typography>
                  <Typography variant="caption" color="text.secondary">Desafios MFA (2FA)</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FailureIcon color="error" sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>3</Typography>
                  <Typography variant="caption" color="text.secondary">Senhas Incorretas</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ShieldIcon color="primary" sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>1</Typography>
                  <Typography variant="caption" color="text.secondary">IPs Bloqueados</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card elevation={2} sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Filtrar por e-mail, IP ou detalhe..."
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

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
              <Table id="tabela-auditoria" aria-label="Tabela de Auditoria">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Data & Hora</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Identificador / E-mail</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Endereço IP</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Resultado</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Detalhes do Evento</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        Nenhum registro de auditoria encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{log.timestamp}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{log.email}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{log.ipAddress}</TableCell>
                        <TableCell>{getStatusChip(log.status)}</TableCell>
                        <TableCell>{log.details}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default AdminAuditoria;

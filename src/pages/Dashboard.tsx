import { FC } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  CheckCircle as CheckCircleIcon,
  VpnKey as KeyIcon,
  AccountBalanceWallet as WalletIcon,
} from '@mui/icons-material';

const Dashboard: FC = () => {
  const { user, accessToken, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Workbox Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'secondary.main', width: 34, height: 34 }}>
                <PersonIcon fontSize="small" />
              </Avatar>
              <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {user?.username || 'Usuário'}
              </Typography>
            </Box>
            <Button
              color="inherit"
              variant="outlined"
              size="small"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{ borderColor: 'rgba(255,255,255,0.5)' }}
            >
              Sair
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={1} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Bem-vindo ao Workbox, {user?.username || 'Usuário'}!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sessão autenticada via Spring Boot Security (JWT HS256) emitida por <code>workbox-api</code>.
          </Typography>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">
                    Perfil do Usuário
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>ID:</strong> {user?.id || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Username:</strong> {user?.username || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>E-mail:</strong> {user?.email || 'Não cadastrado'}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={user?.enabled ? 'Conta Ativa' : 'Inativo'}
                    color={user?.enabled ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <KeyIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">
                    Sessão & Tokens
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Status JWT:</strong> Ativo
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 1,
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    bgcolor: 'grey.100',
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  {accessToken ? `${accessToken.substring(0, 48)}...` : 'Nenhum token'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <WalletIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">
                    Microserviços Conectados
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>workbox-api:</strong> 8080 (Identidade)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>budget-service:</strong> 8081 (Finanças / Resource Server)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;

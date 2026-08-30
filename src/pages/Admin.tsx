import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  PeopleAlt as UsersIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import AppNavbar from '@/components/AppNavbar';

const Admin: FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      {/* Barra de Navegação Permanente com Perfil e Logout */}
      <AppNavbar
        title="Painel de Administração"
        icon={<AdminIcon sx={{ mr: 0.5 }} />}
        showBackButton
        backPath="/dashboard"
        backLabel="Voltar aos Módulos"
      />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Paper elevation={1} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
            Gestão Administrativa & Segurança
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Módulo de controle e governança exclusivo para administradores.
          </Typography>
        </Paper>

        <Grid container spacing={3}>
          {/* Card 1: Gestão de Usuários */}
          <Grid item xs={12} md={4}>
            <Card
              elevation={2}
              sx={{
                height: '100%',
                borderRadius: 2,
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea
                onClick={() => navigate('/admin/usuarios')}
                sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <UsersIcon color="primary" sx={{ fontSize: 36 }} />
                  <Chip label="Gerenciar" size="small" color="primary" />
                </Box>
                <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
                  Gestão de Usuários
                </Typography>
                <Divider sx={{ width: '100%', mb: 1.5 }} />
                <Typography variant="body2" color="text.secondary">
                  Controle de contas, habilitação/desabilitação, redefinição de senhas e edição cadastral.
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>

          {/* Card 2: Papéis & Permissões */}
          <Grid item xs={12} md={4}>
            <Card
              elevation={2}
              sx={{
                height: '100%',
                borderRadius: 2,
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea
                onClick={() => navigate('/admin/papeis')}
                sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <SecurityIcon color="primary" sx={{ fontSize: 36 }} />
                  <Chip label="Gerenciar" size="small" color="primary" />
                </Box>
                <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
                  Papéis & Permissões
                </Typography>
                <Divider sx={{ width: '100%', mb: 1.5 }} />
                <Typography variant="body2" color="text.secondary">
                  Gerenciamento de papéis de usuários (ADMIN, USER) e níveis de autoridade de acesso.
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>

          {/* Card 3: Auditoria de Logins */}
          <Grid item xs={12} md={4}>
            <Card
              elevation={2}
              sx={{
                height: '100%',
                borderRadius: 2,
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea
                onClick={() => navigate('/admin/auditoria')}
                sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <HistoryIcon color="primary" sx={{ fontSize: 36 }} />
                  <Chip label="Visualizar" size="small" color="primary" />
                </Box>
                <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
                  Auditoria de Logins
                </Typography>
                <Divider sx={{ width: '100%', mb: 1.5 }} />
                <Typography variant="body2" color="text.secondary">
                  Histórico de tentativas de acesso, endereços IP, eventos de MFA e auditoria de segurança.
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Admin;

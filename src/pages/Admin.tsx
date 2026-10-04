import { FC, ReactElement } from 'react';
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
  AccountTree as ModulesIcon,
  Backup as BackupIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import AppNavbar from '@/components/AppNavbar';

interface IAdminCard {
  title: string;
  description: string;
  path: string;
  chip: string;
  icon: ReactElement;
}

// Ordem de exibição do painel. Card novo = uma linha aqui (e a rota em routes.tsx).
const ADMIN_CARDS: IAdminCard[] = [
  {
    title: 'Gestão de Usuários',
    description: 'Controle de contas, habilitação/desabilitação, redefinição de senhas e edição cadastral.',
    path: '/admin/usuarios',
    chip: 'Gerenciar',
    icon: <UsersIcon color="primary" sx={{ fontSize: 36 }} />,
  },
  {
    title: 'Papéis & Permissões',
    description: 'Gerenciamento de papéis de usuários (ADMIN, USER) e níveis de autoridade de acesso.',
    path: '/admin/papeis',
    chip: 'Gerenciar',
    icon: <SecurityIcon color="primary" sx={{ fontSize: 36 }} />,
  },
  {
    title: 'Papéis × Módulos',
    description: 'Vínculo entre papéis e módulos do sistema: o usuário só acessa os módulos liberados pelos seus papéis.',
    path: '/admin/modulos',
    chip: 'Gerenciar',
    icon: <ModulesIcon color="primary" sx={{ fontSize: 36 }} />,
  },
  {
    title: 'Backup do banco',
    description: 'Gera, baixa e apaga backups completos do banco de dados, com cifra opcional por senha.',
    path: '/admin/backups',
    chip: 'Gerenciar',
    icon: <BackupIcon color="primary" sx={{ fontSize: 36 }} />,
  },
  {
    title: 'Auditoria de Logins',
    description: 'Histórico de tentativas de acesso, endereços IP, eventos de MFA e auditoria de segurança.',
    path: '/admin/auditoria',
    chip: 'Visualizar',
    icon: <HistoryIcon color="primary" sx={{ fontSize: 36 }} />,
  },
];

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
          {ADMIN_CARDS.map((card) => (
            <Grid item xs={12} md={6} lg={3} key={card.path}>
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
                  onClick={() => navigate(card.path)}
                  sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                >
                  <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    {card.icon}
                    <Chip label={card.chip} size="small" color="primary" />
                  </Box>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
                    {card.title}
                  </Typography>
                  <Divider sx={{ width: '100%', mb: 1.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    {card.description}
                  </Typography>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Admin;

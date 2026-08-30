import { FC } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  Grid,
  Paper,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  AccountBalanceWallet as WalletIcon,
  AdminPanelSettings as AdminIcon,
  Assignment as TasksIcon,
  Description as DocsIcon,
  Chat as ChatIcon,
  BarChart as AnalyticsIcon,
  People as CrmIcon,
  Inventory as InventoryIcon,
  Badge as RhIcon,
  AutoFixHigh as AutomationIcon,
  Settings as SettingsIcon,
  SupportAgent as SupportIcon,
} from '@mui/icons-material';

interface IModuleCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path?: string;
  enabled: boolean;
  adminOnly?: boolean;
}

const MODULES_LIST: IModuleCard[] = [
  {
    id: 'financas',
    title: 'Finanças',
    description: 'Controle de receitas, despesas, contas, metas e orçamentos.',
    icon: <WalletIcon sx={{ fontSize: 40 }} color="primary" />,
    path: '/financas',
    enabled: true,
  },
  {
    id: 'administracao',
    title: 'Administração',
    description: 'Gestão de usuários, papéis, auditoria de logins e governança.',
    icon: <AdminIcon sx={{ fontSize: 40 }} color="primary" />,
    path: '/admin',
    enabled: true,
    adminOnly: true,
  },
  {
    id: 'tarefas',
    title: 'Tarefas & Projetos',
    description: 'Quadros Kanban, acompanhamento de sprints, marcos e prazos.',
    icon: <TasksIcon sx={{ fontSize: 40 }} color="disabled" />,
    enabled: false,
  },
  {
    id: 'documentos',
    title: 'Documentos & Wiki',
    description: 'Repositório central de arquivos, notas colaborativas e manuais.',
    icon: <DocsIcon sx={{ fontSize: 40 }} color="disabled" />,
    enabled: false,
  },
  {
    id: 'comunicacao',
    title: 'Comunicação & Chat',
    description: 'Canais de equipe, conversas diretas e integrações instantâneas.',
    icon: <ChatIcon sx={{ fontSize: 40 }} color="disabled" />,
    enabled: false,
  },
  {
    id: 'relatorios',
    title: 'Relatórios & Analytics',
    description: 'Dashboards analíticos, métricas operacionais e exportação.',
    icon: <AnalyticsIcon sx={{ fontSize: 40 }} color="disabled" />,
    enabled: false,
  },
  {
    id: 'crm',
    title: 'CRM & Clientes',
    description: 'Funil de vendas, cadastro de contatos e histórico comercial.',
    icon: <CrmIcon sx={{ fontSize: 40 }} color="disabled" />,
    enabled: false,
  },
  {
    id: 'estoque',
    title: 'Estoque & Produtos',
    description: 'Catálogo de itens, movimentações de entrada/saída e suprimentos.',
    icon: <InventoryIcon sx={{ fontSize: 40 }} color="disabled" />,
    enabled: false,
  },
  {
    id: 'rh',
    title: 'RH & Pessoas',
    description: 'Gestão de colaboradores, benefícios, solicitações e organograma.',
    icon: <RhIcon sx={{ fontSize: 40 }} color="disabled" />,
    enabled: false,
  },
  {
    id: 'automacoes',
    title: 'Automações & Webhooks',
    description: 'Gatilhos automatizados, rotinas programadas e integrações externas.',
    icon: <AutomationIcon sx={{ fontSize: 40 }} color="disabled" />,
    enabled: false,
  },
  {
    id: 'configuracoes',
    title: 'Configurações Globais',
    description: 'Preferências da organização, personalização de temas e segurança.',
    icon: <SettingsIcon sx={{ fontSize: 40 }} color="disabled" />,
    enabled: false,
  },
  {
    id: 'suporte',
    title: 'Suporte & Helpdesk',
    description: 'Central de ajuda, abertura de chamados técnicos e documentação.',
    icon: <SupportIcon sx={{ fontSize: 40 }} color="disabled" />,
    enabled: false,
  },
];

const Dashboard: FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Filtra cards de acordo com privilégios do usuário
  const visibleModules = MODULES_LIST.filter(
    (mod) => !mod.adminOnly || isAdmin
  );

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="primary" elevation={1} sx={{ width: '100%' }}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Workbox Hub
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'secondary.main', width: 34, height: 34 }}>
                <PersonIcon fontSize="small" />
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {user?.username || 'Usuário'}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                  {isAdmin ? 'Administrador' : 'Usuário'}
                </Typography>
              </Box>
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

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Paper elevation={1} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Olá, {user?.username || 'Usuário'}! Selecione um módulo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Navegue pelos serviços e ferramentas do ecossistema Workbox.
          </Typography>
        </Paper>

        <Grid container spacing={3}>
          {visibleModules.map((mod) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={mod.id}>
              {mod.enabled ? (
                <Card
                  elevation={2}
                  sx={{
                    height: '100%',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => mod.path && navigate(mod.path)}
                    sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}
                  >
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>{mod.icon}</Box>
                      <Chip label="Acessar" size="small" color="primary" variant="filled" />
                    </Box>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 600, mb: 1 }}>
                      {mod.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {mod.description}
                    </Typography>
                  </CardActionArea>
                </Card>
              ) : (
                <Card
                  elevation={1}
                  sx={{
                    height: '100%',
                    borderRadius: 2,
                    opacity: 0.65,
                    bgcolor: 'background.paper',
                    cursor: 'not-allowed',
                    display: 'flex',
                    flexDirection: 'column',
                    p: 2,
                  }}
                >
                  <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>{mod.icon}</Box>
                      <Chip
                        label="Em breve"
                        size="small"
                        sx={{ bgcolor: 'grey.200', color: 'text.secondary', fontWeight: 500 }}
                      />
                    </Box>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                      {mod.title}
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      {mod.description}
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;

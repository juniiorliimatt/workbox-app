import { FC } from 'react';
import { Box, Card, CardContent, Container, Divider, Grid, Paper, Typography, CardActionArea } from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Savings as SavingsIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import AppNavbar from '@/components/AppNavbar';
import { useNavigate } from 'react-router-dom';

const Financas: FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar
        title="Workbox Finanças"
        icon={<WalletIcon sx={{ mr: 0.5 }} />}
        showBackButton
        backPath="/dashboard"
        backLabel="Voltar aos Módulos"
      />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Paper elevation={1} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Gestão Financeira & Orçamentos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Módulo conectado ao microserviço <code>budget-service</code> (Resource Server na porta 8081).
          </Typography>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
              <CardActionArea sx={{ height: '100%' }} onClick={() => navigate('/financas/receitas')}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">Receitas</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Controle de entradas financeiras e fontes de receita.
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
              <CardActionArea sx={{ height: '100%' }} onClick={() => navigate('/financas/despesas')}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingDownIcon color="error" sx={{ mr: 1 }} />
                    <Typography variant="h6">Despesas</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Categorização de saídas, contas e cartões de crédito.
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
              <CardActionArea sx={{ height: '100%' }} onClick={() => navigate('/financas/orcamentos')}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SavingsIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Metas e Orçamentos</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Planejamento mensal e reserva de emergência (regra 50-30-20).
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        
          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
              <CardActionArea sx={{ height: '100%' }} onClick={() => navigate('/financas/tipos')}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CategoryIcon color="secondary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Gerenciamento de Tipos</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Gestão centralizada dos tipos de receitas e despesas.
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>

      </Container>
    </Box>
  );
};

export default Financas;

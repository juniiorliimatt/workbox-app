import { FC } from 'react';
import { Box, Container, Grid, Paper, Typography } from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Savings as SavingsIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import AppNavbar from '@/components/AppNavbar';
import SectionCard from '@/components/SectionCard';
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
            Módulo conectado ao microserviço <code>budget-service</code> (Resource Server na porta 7052).
          </Typography>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <SectionCard title="Receitas" description="Controle de entradas financeiras e fontes de receita." icon={<TrendingUpIcon color="success" />} onClick={() => navigate('/financas/receitas')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <SectionCard title="Despesas" description="Categorização de saídas, contas e cartões de crédito." icon={<TrendingDownIcon color="error" />} onClick={() => navigate('/financas/despesas')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <SectionCard title="Metas e Orçamentos" description="Planejamento mensal e reserva de emergência (regra 50-30-20)." icon={<SavingsIcon color="primary" />} onClick={() => navigate('/financas/orcamentos')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <SectionCard title="Gerenciamento de Tipos" description="Gestão centralizada dos tipos de receitas e despesas." icon={<CategoryIcon color="secondary" />} onClick={() => navigate('/financas/tipos')} />
          </Grid>
        </Grid>

      </Container>
    </Box>
  );
};

export default Financas;

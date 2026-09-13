import { FC, useState } from 'react';
import { Box, Container, Tab, Tabs, Paper } from '@mui/material';
import { AccountBalanceWallet as WalletIcon } from '@mui/icons-material';
import AppNavbar from '@/components/AppNavbar';
import ReceitasTab from './financas/ReceitasTab';
import DespesasTab from './financas/DespesasTab';
import OrcamentosTab from './financas/OrcamentosTab';

const Financas: FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar
        title="Workbox Finanças"
        icon={<WalletIcon sx={{ mr: 0.5 }} />}
        showBackButton
        backPath="/dashboard"
        backLabel="Voltar aos Módulos"
      />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Paper elevation={1} sx={{ mb: 3, borderRadius: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, nv) => setActiveTab(nv)}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="Metas e Orçamentos" />
            <Tab label="Receitas" />
            <Tab label="Despesas" />
          </Tabs>
        </Paper>

        <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
          <OrcamentosTab active={activeTab === 0} />
        </Box>
        <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
          <ReceitasTab active={activeTab === 1} />
        </Box>
        <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
          <DespesasTab active={activeTab === 2} />
        </Box>
      </Container>
    </Box>
  );
};

export default Financas;

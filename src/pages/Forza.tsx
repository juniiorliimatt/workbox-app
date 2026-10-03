import { FC } from 'react';
import { Box, Container, Grid, Paper, Typography } from '@mui/material';
import { Sensors as LiveIcon, SportsMotorsports as ForzaIcon, History as SessionsIcon, Tune as TuneIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AppNavbar from '@/components/AppNavbar';
import SectionCard from '@/components/SectionCard';

const Forza: FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar
        title="Workbox Forza"
        icon={<ForzaIcon sx={{ mr: 0.5 }} />}
        showBackButton
        backPath="/dashboard"
        backLabel="Voltar aos Módulos"
      />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Paper elevation={1} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
            Telemetria & Tuning
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Módulo conectado ao microserviço <code>forza-telemetry-service</code> (Resource Server na porta 7057), que recebe o Data Out
            do jogo por UDP.
          </Typography>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <SectionCard
              title="Sessões"
              description="Histórico de sessões com voltas, gráficos de telemetria e o resumo de tuning para ajustar o setup."
              icon={<SessionsIcon color="primary" />}
              onClick={() => navigate('/forza/sessoes')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SectionCard
              title="Ao vivo"
              description="Velocidade, marcha, pedais, pneus e voltas em tempo real enquanto você pilota."
              icon={<LiveIcon color="success" />}
              onClick={() => navigate('/forza/ao-vivo')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SectionCard
              title="Tuning (FH6)"
              description="Recomendação de ajustes por carro, com todas as guias de tuning, a partir das sessões coletadas (mínimo de 10 por carro)."
              icon={<TuneIcon color="secondary" />}
              onClick={() => navigate('/forza/tuning')}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Forza;

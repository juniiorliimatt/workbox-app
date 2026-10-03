import { FC } from 'react';
import { Box, Card, CardActionArea, CardContent, Container, Divider, Grid, Paper, Typography } from '@mui/material';
import { Sensors as LiveIcon, SportsMotorsports as ForzaIcon, History as SessionsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AppNavbar from '@/components/AppNavbar';

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
            <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
              <CardActionArea sx={{ height: '100%' }} onClick={() => navigate('/forza/sessoes')}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SessionsIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Sessões</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Histórico de sessões com voltas, gráficos de telemetria e o resumo de tuning para ajustar o setup.
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
              <CardActionArea sx={{ height: '100%' }} onClick={() => navigate('/forza/ao-vivo')}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LiveIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">Ao vivo</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Velocidade, marcha, pedais, pneus e voltas em tempo real enquanto você pilota.
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

export default Forza;

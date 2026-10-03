import { FC } from 'react';
import { Alert, Box, Chip, CircularProgress, Container, Grid, LinearProgress, Paper, Typography } from '@mui/material';
import { SportsMotorsports as ForzaIcon } from '@mui/icons-material';
import AppNavbar from '@/components/AppNavbar';
import StatTile from '@/components/forza/StatTile';
import { useLiveSnapshot } from '@/hooks/useLiveSnapshot';
import { LiveSnapshotDTO } from '@/interfaces/forza';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { formatLapTime, formatNumber, formatTemperature } from '@/utils/forza';

const TIRE_LABELS = ['FL', 'FR', 'RL', 'RR'];
const PEDAL_MAX = 255;

const pedalPercent = (value: number | null | undefined) => Math.round(((value ?? 0) / PEDAL_MAX) * 100);

const Pedal: FC<{ label: string; value: number | null | undefined; color: 'success' | 'error' }> = ({ label, value, color }) => {
  const percent = pedalPercent(value);
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="body2" component="p">{`${label} ${percent}%`}</Typography>
      <LinearProgress variant="determinate" value={percent} color={color} aria-label={label} sx={{ height: 10, borderRadius: 5 }} />
    </Box>
  );
};

const LivePanel: FC<{ snapshot: LiveSnapshotDTO }> = ({ snapshot }) => {
  const hasDash = snapshot.speedKmh != null;
  const rpmPercent = snapshot.engineMaxRpm > 0 ? Math.min(100, Math.round((snapshot.rpm / snapshot.engineMaxRpm) * 100)) : 0;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="body2" component="p" sx={{ mb: 0.5 }}>
            {`${formatNumber(snapshot.rpm, 0)} / ${formatNumber(snapshot.engineMaxRpm, 0)} rpm`}
          </Typography>
          <LinearProgress variant="determinate" value={rpmPercent} aria-label="Rotação do motor" sx={{ height: 12, borderRadius: 6 }} />
        </Paper>
      </Grid>

      {!hasDash ? (
        <Grid item xs={12}>
          <Alert severity="info">
            Formato Sled: sem dados de Dash (velocidade, marcha, pedais e pneus). No Forza Motorsport, escolha o formato Dash.
          </Alert>
        </Grid>
      ) : (
        <>
          <Grid item xs={6} md={3}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
              <Typography variant="caption" color="text.secondary" component="p">
                Velocidade
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 700 }}>{`${formatNumber(snapshot.speedKmh, 0)} km/h`}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
              <Typography variant="caption" color="text.secondary" component="p">
                Marcha
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 700 }}>
                {snapshot.gear === 0 ? 'R/N' : snapshot.gear}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
              <Pedal label="Acelerador" value={snapshot.accel} color="success" />
              <Pedal label="Freio" value={snapshot.brake} color="error" />
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
                Temperatura dos pneus
              </Typography>
              <Grid container spacing={1}>
                {TIRE_LABELS.map((label, index) => (
                  <Grid item xs={6} key={label}>
                    <Typography variant="caption" color="text.secondary" component="p">
                      {label}
                    </Typography>
                    <Typography component="p">{formatTemperature(snapshot.tireTempF?.[index])}</Typography>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <StatTile label="Volta atual" value={formatLapTime(snapshot.currentLapS)} hint={snapshot.lapNumber != null ? `Volta ${snapshot.lapNumber}` : undefined} />
              </Grid>
              <Grid item xs={4}>
                <StatTile label="Última volta" value={formatLapTime(snapshot.lastLapS)} />
              </Grid>
              <Grid item xs={4}>
                <StatTile label="Melhor volta" value={formatLapTime(snapshot.bestLapS)} />
              </Grid>
            </Grid>
          </Grid>
        </>
      )}
    </Grid>
  );
};

const AoVivo: FC = () => {
  const api = useAxiosWithAuth();
  const { snapshot, status } = useLiveSnapshot(api);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar title="Workbox Forza" icon={<ForzaIcon sx={{ mr: 0.5 }} />} showBackButton backPath="/forza" backLabel="Voltar" />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            Telemetria ao vivo
          </Typography>
          {snapshot && <Chip size="small" label={snapshot.raceOn ? 'Ao vivo' : 'Pausado'} color={snapshot.raceOn ? 'success' : 'default'} />}
          {snapshot && (
            <Chip
              size="small"
              variant="outlined"
              label={`${snapshot.gameFormat} · carro #${snapshot.carOrdinal} · PI ${snapshot.performanceIndex}`}
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Atualiza a cada segundo enquanto a aba estiver visível.
        </Typography>

        {status === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Falha ao consultar a telemetria. Tentando novamente…
          </Alert>
        )}

        {status === 'loading' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        )}

        {status === 'waiting' && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h6" component="p" sx={{ mb: 1 }}>
              Aguardando telemetria do jogo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ative o Data Out no jogo apontando para o IP deste PC, porta 5310. Nenhum pacote chegou nos últimos 5 segundos.
            </Typography>
          </Paper>
        )}

        {snapshot && <LivePanel snapshot={snapshot} />}
      </Container>
    </Box>
  );
};

export default AoVivo;

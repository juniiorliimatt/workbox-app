import { FC, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { History as HistoryIcon, SportsMotorsports as ForzaIcon } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AppNavbar from '@/components/AppNavbar';
import { TuningCarDTO } from '@/interfaces/forza';
import { listTuningCars } from '@/services/forzaApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { carLabel, formatNumber } from '@/utils/forza';

/** Atualiza o progresso da sessão em andamento (e as que fecharam) sem o usuário recarregar a página. */
const REFRESH_MS = 15_000;

const TuningCarros: FC = () => {
  const api = useAxiosWithAuth();
  const navigate = useNavigate();
  const [cars, setCars] = useState<TuningCarDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(false);
      try {
        setCars(await listTuningCars(api, signal));
      } catch (e) {
        if (axios.isCancel(e)) return;
        setError(true);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Atualização silenciosa (sem spinner, erro ignorado: mantém a lista atual); pausa com a aba oculta.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        setCars(await listTuningCars(api, controller.signal));
      } catch {
        /* mantém a lista atual */
      }
    }, REFRESH_MS);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [api]);

  const required = cars[0]?.requiredSessions ?? 10;
  const open = (car: TuningCarDTO) => navigate(`/forza/tuning/${car.carOrdinal}/${car.performanceClass}`);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar title="Workbox Forza" icon={<ForzaIcon sx={{ mr: 0.5 }} />} showBackButton backPath="/forza" backLabel="Voltar" />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Box>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Tuning (FH6)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Escolha um carro para ver a recomendação de ajustes calculada a partir das suas sessões.
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<HistoryIcon />} onClick={() => navigate('/forza/tuning/historico')}>
            Tunings feitos
          </Button>
        </Box>

        {cars.length > 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            A recomendação precisa de pelo menos {required} sessões com o mesmo carro (e um volume mínimo de pilotagem gravada) e considera as mais recentes.
            Vale para o Horizon (FH4/FH5/FH6 usam o mesmo pacote do Data Out, então o jogo não é distinguido).
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => load()}>
                Tentar novamente
              </Button>
            }
          >
            Não foi possível carregar os carros.
          </Alert>
        )}

        {!loading && !error && cars.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h6" component="p" sx={{ mb: 1 }}>
              Nenhum carro com sessões coletadas ainda
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Dirija com a telemetria ligada (Data Out) — cada carro precisa de várias sessões antes de receber recomendação.
            </Typography>
          </Paper>
        )}

        {!loading && !error && cars.length > 0 && (
          <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
            <Table aria-label="Carros com sessões coletadas">
              <TableHead>
                <TableRow>
                  <TableCell>Carro</TableCell>
                  <TableCell>Classe / PI</TableCell>
                  <TableCell>Tração</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Progresso</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cars.map((car) => {
                  const label = carLabel(car.carName, car.carOrdinal);
                  const percent = Math.min(100, Math.round((car.sessions / car.requiredSessions) * 100));
                  return (
                    <TableRow key={`${car.carOrdinal}-${car.performanceClass}`} hover onClick={() => open(car)} sx={{ cursor: 'pointer' }}>
                      <TableCell>
                        <Button
                          size="small"
                          aria-label={`Abrir tuning de ${label} (${car.performanceClass})`}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', minWidth: 0, px: 1 }}
                          onClick={(event) => {
                            event.stopPropagation();
                            open(car);
                          }}
                        >
                          {label}
                        </Button>
                      </TableCell>
                      <TableCell>{`${car.performanceClass} · PI ${car.performanceIndex}`}</TableCell>
                      <TableCell>{car.drivetrain}</TableCell>
                      <TableCell>
                        <Typography variant="body2" component="p">{`${car.sessions} de ${car.requiredSessions} sessões`}</Typography>
                        <LinearProgress variant="determinate" value={percent} aria-label={`Progresso de ${label}`} sx={{ height: 6, borderRadius: 3, mt: 0.5 }} />
                        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
                          {/* Total ao vivo: sessões fechadas + a em andamento (a recomendação, porém, só usa as fechadas). */}
                          {`${formatNumber(car.samples + (car.activeSession?.samples ?? 0), 0)} de ${formatNumber(car.requiredSamples, 0)} amostras`}
                        </Typography>
                        {car.activeSession && (
                          <Typography variant="caption" color="text.secondary" component="p">
                            {`(${formatNumber(car.samples, 0)} em sessões fechadas + ${formatNumber(car.activeSession.samples, 0)} em andamento)`}
                            {car.ready ? '' : ' A recomendação usa só sessões fechadas.'}
                          </Typography>
                        )}
                        {car.activeSession && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" component="p" sx={{ fontWeight: 600 }}>
                              {car.activeSession.samples > car.activeSession.targetSamples
                                ? `Gravando agora: ${formatNumber(car.activeSession.samples, 0)} amostras`
                                : `Gravando agora: ${formatNumber(car.activeSession.samples, 0)} de ${formatNumber(car.activeSession.targetSamples, 0)} amostras`}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              color="secondary"
                              value={Math.min(100, Math.round((car.activeSession.samples / car.activeSession.targetSamples) * 100))}
                              aria-label="Sessão em andamento"
                              sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                            />
                            <Typography variant="caption" color="text.secondary" component="p">
                              {car.activeSession.samples > car.activeSession.targetSamples
                                ? 'Corrida ou evento em andamento: só fecha e passa a contar quando terminar.'
                                : 'Entra na contagem ao fechar (ao chegar no alvo ou ao trocar de carro ou classe).'}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={car.ready ? 'Pronto' : 'Coletando'} color={car.ready ? 'success' : 'default'} variant={car.ready ? 'filled' : 'outlined'} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </Box>
  );
};

export default TuningCarros;

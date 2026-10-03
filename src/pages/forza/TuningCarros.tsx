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
import { SportsMotorsports as ForzaIcon } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AppNavbar from '@/components/AppNavbar';
import { TuningCarDTO } from '@/interfaces/forza';
import { listTuningCars } from '@/services/forzaApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { carClassLabel, carLabel } from '@/utils/forza';

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

  const required = cars[0]?.requiredSessions ?? 10;
  const open = (car: TuningCarDTO) => navigate(`/forza/tuning/${car.carOrdinal}`);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar title="Workbox Forza" icon={<ForzaIcon sx={{ mr: 0.5 }} />} showBackButton backPath="/forza" backLabel="Voltar" />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Tuning (FH6)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Escolha um carro para ver a recomendação de ajustes calculada a partir das suas sessões.
        </Typography>

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
                    <TableRow key={car.carOrdinal} hover onClick={() => open(car)} sx={{ cursor: 'pointer' }}>
                      <TableCell>
                        <Button
                          size="small"
                          aria-label={`Abrir tuning de ${label}`}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', minWidth: 0, px: 1 }}
                          onClick={(event) => {
                            event.stopPropagation();
                            open(car);
                          }}
                        >
                          {label}
                        </Button>
                      </TableCell>
                      <TableCell>{`${carClassLabel(car.carClass)} · PI ${car.performanceIndex}`}</TableCell>
                      <TableCell>{car.drivetrain}</TableCell>
                      <TableCell>
                        <Typography variant="body2" component="p">{`${car.sessions} de ${car.requiredSessions} sessões`}</Typography>
                        <LinearProgress variant="determinate" value={percent} aria-label={`Progresso de ${label}`} sx={{ height: 6, borderRadius: 3, mt: 0.5 }} />
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

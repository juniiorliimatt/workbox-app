import { FC, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
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
import DataOutHint from '@/components/forza/DataOutHint';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SessionDTO } from '@/interfaces/forza';
import { listSessions } from '@/services/forzaApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { carClassLabel, carLabel, formatNumber, formatSessionStart } from '@/utils/forza';

const PAGE_SIZE = 20;

const Sessoes: FC = () => {
  const api = useAxiosWithAuth();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const loadFirstPage = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(false);
      try {
        const page = await listSessions(api, { size: PAGE_SIZE }, signal);
        setSessions(page.items);
        setNextCursor(page.nextCursor ?? null);
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
    loadFirstPage(controller.signal);
    return () => controller.abort();
  }, [loadFirstPage]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await listSessions(api, { size: PAGE_SIZE, cursor: nextCursor });
      setSessions((previous) => [...previous, ...page.items]);
      setNextCursor(page.nextCursor ?? null);
    } catch {
      showSnackbar('Falha ao carregar mais sessões.', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const open = (id: string) => navigate(`/forza/sessoes/${id}`);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar title="Workbox Forza" icon={<ForzaIcon sx={{ mr: 0.5 }} />} showBackButton backPath="/forza" backLabel="Voltar" />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Sessões de telemetria
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Mais recentes primeiro. Uma sessão é um trecho contínuo com o mesmo carro.
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => loadFirstPage()}>
                Tentar novamente
              </Button>
            }
          >
            Não foi possível carregar as sessões.
          </Alert>
        )}

        {!loading && !error && sessions.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h6" component="p" sx={{ mb: 1 }}>
              Nenhuma sessão registrada ainda
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <DataOutHint /> Depois entre em uma corrida.
            </Typography>
          </Paper>
        )}

        {!loading && !error && sessions.length > 0 && (
          <>
            <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
              <Table aria-label="Sessões de telemetria">
                <TableHead>
                  <TableRow>
                    <TableCell>Início</TableCell>
                    <TableCell>Carro</TableCell>
                    <TableCell>Classe / PI</TableCell>
                    <TableCell>Tração</TableCell>
                    <TableCell>Formato</TableCell>
                    <TableCell align="right">Amostras</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} hover onClick={() => open(session.id)} sx={{ cursor: 'pointer' }}>
                      <TableCell>{formatSessionStart(session.startedAt)}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          aria-label={`Abrir sessão ${carLabel(session.carName, session.carOrdinal)}`}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', minWidth: 0, px: 1 }}
                          onClick={(event) => {
                            event.stopPropagation();
                            open(session.id);
                          }}
                        >
                          {carLabel(session.carName, session.carOrdinal)}
                        </Button>
                      </TableCell>
                      <TableCell>{`${carClassLabel(session.carClass)} · PI ${session.performanceIndex}`}</TableCell>
                      <TableCell>{session.drivetrain}</TableCell>
                      <TableCell>{session.gameFormat}</TableCell>
                      <TableCell align="right">{formatNumber(session.sampleCount, 0)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={session.active ? 'Ativa' : 'Encerrada'}
                          color={session.active ? 'success' : 'default'}
                          variant={session.active ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {nextCursor && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button variant="outlined" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Carregando…' : 'Carregar mais'}
                </Button>
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default Sessoes;

import { ChangeEvent, FC, useCallback, useEffect, useRef, useState } from 'react';
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
  TablePagination,
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

const PAGE_SIZE_OPTIONS = [5, 15, 30];
const DEFAULT_PAGE_SIZE = 5;

const Sessoes: FC = () => {
  const api = useAxiosWithAuth();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState(false);

  // A API pagina por cursor (sem OFFSET): guardamos o cursor de cada página já vista para poder voltar.
  // cursors.current[i] = cursor que abre a página i (a primeira não tem).
  const cursors = useRef<(string | undefined)[]>([undefined]);
  // Trava síncrona: dois cliques seguidos não podem pedir a mesma página duas vezes.
  const inFlight = useRef(false);

  const fetchPage = useCallback(
    async (index: number, size: number, signal?: AbortSignal) => {
      const cursor = cursors.current[index];
      const page = await listSessions(api, cursor ? { size, cursor } : { size }, signal);
      cursors.current[index + 1] = page.nextCursor ?? undefined;
      setSessions(page.items);
      setHasNext(Boolean(page.nextCursor));
      setPageIndex(index);
    },
    [api],
  );

  const loadFirstPage = useCallback(
    async (signal?: AbortSignal, size = DEFAULT_PAGE_SIZE) => {
      setLoading(true);
      setError(false);
      cursors.current = [undefined];
      try {
        await fetchPage(0, size, signal);
      } catch (e) {
        if (axios.isCancel(e)) return;
        setError(true);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadFirstPage(controller.signal);
    return () => controller.abort();
  }, [loadFirstPage]);

  /** Troca de página ou de tamanho: mantém a lista atual se falhar (só avisa). */
  const goTo = useCallback(
    async (index: number, size: number) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setPageLoading(true);
      try {
        await fetchPage(index, size);
      } catch {
        showSnackbar('Falha ao carregar a página.', 'error');
      } finally {
        inFlight.current = false;
        setPageLoading(false);
      }
    },
    [fetchPage, showSnackbar],
  );

  const changePage = (_event: unknown, newPage: number) => {
    goTo(newPage, pageSize);
  };

  const changePageSize = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const size = Number.parseInt(event.target.value, 10);
    setPageSize(size);
    cursors.current = [undefined];
    goTo(0, size);
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

            <Paper elevation={0} sx={{ mt: 1, borderRadius: 2 }}>
              <TablePagination
                component="nav"
                aria-label="Paginação das sessões"
                // Sem total na API (cursor): enquanto houver próxima página o total é desconhecido (-1); na última é exato.
                count={hasNext ? -1 : pageIndex * pageSize + sessions.length}
                page={pageIndex}
                rowsPerPage={pageSize}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                onPageChange={changePage}
                onRowsPerPageChange={changePageSize}
                labelRowsPerPage="Por página:"
                labelDisplayedRows={({ from, to, count }) => (count === -1 ? `${from}–${to}` : `${from}–${to} de ${count}`)}
                getItemAriaLabel={(type) => ({ first: 'Primeira página', last: 'Última página', next: 'Próxima página', previous: 'Página anterior' })[type]}
                backIconButtonProps={{ disabled: pageIndex === 0 || pageLoading }}
                nextIconButtonProps={{ disabled: !hasNext || pageLoading }}
              />
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default Sessoes;

import { FC, useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { SportsMotorsports as ForzaIcon } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AppNavbar from '@/components/AppNavbar';
import { TuningHistoryItemDTO } from '@/interfaces/forza';
import { listTuningHistory } from '@/services/forzaApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { carClassLabel, carLabel, formatSessionStart } from '@/utils/forza';

const adjustmentsLabel = (count: number) => (count === 0 ? 'Nenhum ajuste' : `${count} ${count === 1 ? 'ajuste' : 'ajustes'}`);

const TuningHistorico: FC = () => {
  const api = useAxiosWithAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<TuningHistoryItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(false);
      try {
        setItems(await listTuningHistory(api, signal));
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

  const open = (item: TuningHistoryItemDTO) => navigate(`/forza/tuning/historico/${item.id}`);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar title="Workbox Forza" icon={<ForzaIcon sx={{ mr: 0.5 }} />} showBackButton backPath="/forza/tuning" backLabel="Voltar ao tuning" />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Tunings feitos
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Cada item é a foto da recomendação de um carro no momento em que você reiniciou a coleta. Continua disponível mesmo depois de o setup mudar.
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
              <Button color="inherit" size="small" onClick={() => load()}>
                Tentar novamente
              </Button>
            }
          >
            Não foi possível carregar o histórico.
          </Alert>
        )}

        {!loading && !error && items.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h6" component="p" sx={{ mb: 1 }}>
              Nenhum tuning salvo ainda
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Quando um carro tiver recomendação pronta e você usar “Reiniciar coleta” depois de aplicar os ajustes, a recomendação anterior é guardada aqui.
            </Typography>
          </Paper>
        )}

        {!loading && !error && items.length > 0 && (
          <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
            <Table aria-label="Tunings salvos">
              <TableHead>
                <TableRow>
                  <TableCell>Carro</TableCell>
                  <TableCell>Classe / PI</TableCell>
                  <TableCell>Tração</TableCell>
                  <TableCell>Salvo em</TableCell>
                  <TableCell>Base</TableCell>
                  <TableCell>Ajustes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => {
                  const label = carLabel(item.carName, item.carOrdinal);
                  return (
                    <TableRow key={item.id} hover onClick={() => open(item)} sx={{ cursor: 'pointer' }}>
                      <TableCell>
                        <Button
                          size="small"
                          aria-label={`Abrir tuning salvo de ${label}`}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', minWidth: 0, px: 1 }}
                          onClick={(event) => {
                            event.stopPropagation();
                            open(item);
                          }}
                        >
                          {label}
                        </Button>
                      </TableCell>
                      <TableCell>{`${carClassLabel(item.carClass)} · PI ${item.performanceIndex}`}</TableCell>
                      <TableCell>{item.drivetrain}</TableCell>
                      <TableCell>{formatSessionStart(item.savedAt)}</TableCell>
                      <TableCell>{`${item.sessions} sessões`}</TableCell>
                      <TableCell>
                        <Chip size="small" label={adjustmentsLabel(item.adjustments)} color={item.adjustments > 0 ? 'warning' : 'success'} variant="outlined" />
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

export default TuningHistorico;

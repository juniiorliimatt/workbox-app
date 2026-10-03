import { FC, useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Container, Paper, Typography } from '@mui/material';
import { RestartAlt as ResetIcon, SportsMotorsports as ForzaIcon } from '@mui/icons-material';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import AppNavbar from '@/components/AppNavbar';
import ConfirmDialog from '@/components/ConfirmDialog';
import TuningRecommendation from '@/components/forza/TuningRecommendation';
import { useSnackbar } from '@/hooks/useSnackbar';
import { TuningRecommendationDTO } from '@/interfaces/forza';
import { getTuningRecommendation, resetTuningCollection } from '@/services/forzaApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { carClassLabel, carLabel, describeDrivetrain } from '@/utils/forza';

type LoadError = 'not-found' | 'generic' | null;

const TuningCarro: FC = () => {
  const { carOrdinal = '' } = useParams<{ carOrdinal: string }>();
  const ordinal = Number(carOrdinal);
  const api = useAxiosWithAuth();
  const { showSnackbar } = useSnackbar();

  const [recommendation, setRecommendation] = useState<TuningRecommendationDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        setRecommendation(await getTuningRecommendation(api, ordinal, signal));
      } catch (e) {
        if (axios.isCancel(e)) return;
        setError(axios.isAxiosError(e) && e.response?.status === 404 ? 'not-found' : 'generic');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [api, ordinal],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const reset = async () => {
    setConfirmReset(false);
    try {
      await resetTuningCollection(api, ordinal);
      showSnackbar('Coleta reiniciada: só as próximas sessões deste carro contam.', 'success');
      await load();
    } catch {
      showSnackbar('Não foi possível reiniciar a coleta.', 'error');
    }
  };

  const title = recommendation ? carLabel(recommendation.carName, recommendation.carOrdinal) : '';

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar title="Workbox Forza" icon={<ForzaIcon sx={{ mr: 0.5 }} />} showBackButton backPath="/forza/tuning" backLabel="Voltar aos carros" />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && error === 'not-found' && <Alert severity="warning">Nenhuma sessão coletada para este carro.</Alert>}

        {!loading && error === 'generic' && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => load()}>
                Tentar novamente
              </Button>
            }
          >
            Não foi possível carregar a recomendação.
          </Alert>
        )}

        {!loading && !error && recommendation && (
          <>
            <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
                    {title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={`${carClassLabel(recommendation.carClass)} · PI ${recommendation.performanceIndex}`} />
                    <Chip size="small" label={describeDrivetrain(recommendation.drivetrain)} />
                    <Chip size="small" label={`#${recommendation.carOrdinal}`} variant="outlined" />
                  </Box>
                </Box>
                <Button variant="outlined" startIcon={<ResetIcon />} onClick={() => setConfirmReset(true)}>
                  Reiniciar coleta
                </Button>
              </Box>
            </Paper>

            <TuningRecommendation recommendation={recommendation} />
          </>
        )}
      </Container>

      <ConfirmDialog
        open={confirmReset}
        title="Reiniciar a coleta deste carro?"
        message="Use depois de aplicar ajustes no jogo: as sessões anteriores deixam de contar e a recomendação volta a coletar do zero com o novo setup."
        confirmColor="warning"
        onConfirm={reset}
        onCancel={() => setConfirmReset(false)}
      />
    </Box>
  );
};

export default TuningCarro;

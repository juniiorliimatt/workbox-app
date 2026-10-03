import { FC, useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Container, Paper, Typography } from '@mui/material';
import { SportsMotorsports as ForzaIcon } from '@mui/icons-material';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import AppNavbar from '@/components/AppNavbar';
import TuningRecommendation from '@/components/forza/TuningRecommendation';
import { TuningHistoryDTO } from '@/interfaces/forza';
import { getTuningHistoryEntry } from '@/services/forzaApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { carClassLabel, carLabel, describeDrivetrain, formatSessionStart } from '@/utils/forza';

type LoadError = 'not-found' | 'generic' | null;

const TuningHistoricoDetalhe: FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const api = useAxiosWithAuth();

  const [entry, setEntry] = useState<TuningHistoryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        setEntry(await getTuningHistoryEntry(api, id, signal));
      } catch (e) {
        if (axios.isCancel(e)) return;
        setError(axios.isAxiosError(e) && e.response?.status === 404 ? 'not-found' : 'generic');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [api, id],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const recommendation = entry?.recommendation;

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar title="Workbox Forza" icon={<ForzaIcon sx={{ mr: 0.5 }} />} showBackButton backPath="/forza/tuning/historico" backLabel="Voltar ao histórico" />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && error === 'not-found' && <Alert severity="warning">Tuning salvo não encontrado.</Alert>}

        {!loading && error === 'generic' && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => load()}>
                Tentar novamente
              </Button>
            }
          >
            Não foi possível carregar o tuning salvo.
          </Alert>
        )}

        {!loading && !error && entry && recommendation && (
          <>
            <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
                {carLabel(recommendation.carName, recommendation.carOrdinal)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                <Chip size="small" label={`${carClassLabel(recommendation.carClass)} · PI ${recommendation.performanceIndex}`} />
                <Chip size="small" label={describeDrivetrain(recommendation.drivetrain)} />
                <Chip size="small" label={`#${recommendation.carOrdinal}`} variant="outlined" />
              </Box>
              <Typography variant="body2" component="p">
                {`Tuning salvo em ${formatSessionStart(entry.savedAt)}`}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="p">
                Esta é a foto do que foi recomendado na época; não muda com as sessões novas do carro.
              </Typography>
            </Paper>

            <TuningRecommendation recommendation={recommendation} snapshot />
          </>
        )}
      </Container>
    </Box>
  );
};

export default TuningHistoricoDetalhe;

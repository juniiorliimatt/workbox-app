import { FC, useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Container, Paper, Tab, Tabs, Typography } from '@mui/material';
import { ContentCopy as CopyIcon, SportsMotorsports as ForzaIcon } from '@mui/icons-material';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import AppNavbar from '@/components/AppNavbar';
import LapsTable from '@/components/forza/LapsTable';
import TelemetryCharts from '@/components/forza/TelemetryCharts';
import TuningSummaryView from '@/components/forza/TuningSummaryView';
import { useSnackbar } from '@/hooks/useSnackbar';
import { LapDTO, SampleDTO, SessionDTO, TuningSummary } from '@/interfaces/forza';
import { getSession, getSessionLaps, getSessionSamples, getSessionSummary } from '@/services/forzaApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { carClassLabel, describeDrivetrain, formatDuration, formatNumber, formatSessionStart } from '@/utils/forza';

/** Teto de amostras pedido ao serviço (~8 min a 20 Hz). Sessões maiores são mostradas truncadas. */
export const SAMPLES_LIMIT = 10000;

type LoadError = 'not-found' | 'generic' | null;
type TabKey = 'resumo' | 'voltas' | 'telemetria';

const TelemetryTab: FC<{ sessionId: string }> = ({ sessionId }) => {
  const api = useAxiosWithAuth();
  const [samples, setSamples] = useState<SampleDTO[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setSamples(null);
    setError(false);
    getSessionSamples(api, sessionId, { limit: SAMPLES_LIMIT }, controller.signal)
      .then(setSamples)
      .catch((e) => {
        if (!axios.isCancel(e)) setError(true);
      });
    return () => controller.abort();
  }, [api, sessionId]);

  if (error) return <Alert severity="error">Não foi possível carregar a telemetria da sessão.</Alert>;
  if (!samples) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (samples.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography color="text.secondary">Esta sessão não tem amostras.</Typography>
      </Paper>
    );
  }

  return (
    <>
      {samples.length >= SAMPLES_LIMIT && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Mostrando as primeiras {formatNumber(SAMPLES_LIMIT, 0)} amostras da sessão.
        </Alert>
      )}
      <TelemetryCharts samples={samples} />
    </>
  );
};

const SessaoDetalhe: FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const api = useAxiosWithAuth();
  const { showSnackbar } = useSnackbar();

  const [session, setSession] = useState<SessionDTO | null>(null);
  const [laps, setLaps] = useState<LapDTO[]>([]);
  const [summary, setSummary] = useState<TuningSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError>(null);
  const [tab, setTab] = useState<TabKey>('resumo');

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const [sessionData, lapsData, summaryData] = await Promise.all([
          getSession(api, id, signal),
          getSessionLaps(api, id, signal),
          getSessionSummary(api, id, signal),
        ]);
        setSession(sessionData);
        setLaps(lapsData);
        setSummary(summaryData);
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

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
      showSnackbar('Resumo copiado para a área de transferência.', 'success');
    } catch {
      showSnackbar('Não foi possível copiar o resumo.', 'error');
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar
        title="Workbox Forza"
        icon={<ForzaIcon sx={{ mr: 0.5 }} />}
        showBackButton
        backPath="/forza/sessoes"
        backLabel="Voltar às Sessões"
      />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && error === 'not-found' && <Alert severity="warning">Sessão não encontrada.</Alert>}

        {!loading && error === 'generic' && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => load()}>
                Tentar novamente
              </Button>
            }
          >
            Não foi possível carregar a sessão.
          </Alert>
        )}

        {!loading && !error && session && summary && (
          <>
            <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                  {session.carName ? session.carName : `Sessão #${session.carOrdinal}`}
                </Typography>
                <Chip
                  size="small"
                  label={session.active ? 'Ativa' : 'Encerrada'}
                  color={session.active ? 'success' : 'default'}
                  variant={session.active ? 'filled' : 'outlined'}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Chip size="small" label={`#${session.carOrdinal}`} variant="outlined" />
                <Chip size="small" label={`${carClassLabel(session.carClass)} · PI ${session.performanceIndex}`} />
                <Chip size="small" label={describeDrivetrain(session.drivetrain)} />
                <Chip size="small" label={`${session.cylinders} cilindros`} />
                <Chip size="small" label={session.gameFormat} variant="outlined" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Início em {formatSessionStart(session.startedAt)} · duração {formatDuration(summary.durationS)} ·{' '}
                {formatNumber(session.sampleCount, 0)} amostras
              </Typography>
              {session.active && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Sessão em andamento — o resumo é calculado na hora, a cada consulta.
                </Typography>
              )}
            </Paper>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Tabs value={tab} onChange={(_, value: TabKey) => setTab(value)} aria-label="Seções da sessão">
                <Tab label="Resumo de tuning" value="resumo" />
                <Tab label="Voltas" value="voltas" />
                <Tab label="Telemetria" value="telemetria" />
              </Tabs>
              {tab === 'resumo' && (
                <Button size="small" startIcon={<CopyIcon />} onClick={copySummary} sx={{ mb: 0.5 }}>
                  Copiar resumo (JSON)
                </Button>
              )}
            </Box>

            {tab === 'resumo' && <TuningSummaryView summary={summary} />}
            {tab === 'voltas' && <LapsTable laps={laps} />}
            {tab === 'telemetria' && <TelemetryTab sessionId={session.id} />}
          </>
        )}
      </Container>
    </Box>
  );
};

export default SessaoDetalhe;

import { FC, useCallback, useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  LinearProgress,
  List,
  ListItem,
  Paper,
  Typography,
} from '@mui/material';
import {
  ArrowDownward as DownIcon,
  ArrowUpward as UpIcon,
  ExpandMore as ExpandIcon,
  RestartAlt as ResetIcon,
  SportsMotorsports as ForzaIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import AppNavbar from '@/components/AppNavbar';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useSnackbar } from '@/hooks/useSnackbar';
import { TuningAxle, TuningGuideDTO, TuningGuideStatus, TuningRecommendationDTO, TuningSuggestionDTO } from '@/interfaces/forza';
import { getTuningRecommendation, resetTuningCollection } from '@/services/forzaApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { carClassLabel, carLabel, describeDrivetrain, formatNumber, formatSessionStart } from '@/utils/forza';

type LoadError = 'not-found' | 'generic' | null;

const AXLE_LABEL: Record<TuningAxle, string | null> = { FRONT: 'Dianteira', REAR: 'Traseira', BOTH: 'Ambos os eixos', NONE: null };

const STATUS: Record<TuningGuideStatus, { label: string; color: 'warning' | 'success' | 'default' }> = {
  ADJUST: { label: 'Ajustar', color: 'warning' },
  OK: { label: 'OK', color: 'success' },
  NO_SIGNAL: { label: 'Sem sinal na telemetria', color: 'default' },
};

/** Sentido em texto + ícone (a informação nunca fica só na cor). */
const Direction: FC<{ direction: TuningSuggestionDTO['direction'] }> = ({ direction }) => (
  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700 }}>
    {direction === 'INCREASE' ? <UpIcon fontSize="small" aria-hidden /> : <DownIcon fontSize="small" aria-hidden />}
    {direction === 'INCREASE' ? 'Aumentar' : 'Reduzir'}
  </Box>
);

const Suggestion: FC<{ suggestion: TuningSuggestionDTO }> = ({ suggestion }) => {
  const axle = AXLE_LABEL[suggestion.axle];
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography component="span" sx={{ fontWeight: 600 }}>
          {suggestion.parameter}
        </Typography>
        <Direction direction={suggestion.direction} />
        {axle && <Chip size="small" variant="outlined" label={axle} />}
      </Box>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {suggestion.rationale}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
        Evidência: {suggestion.evidence}
      </Typography>
    </Box>
  );
};

const GuideAccordion: FC<{ guide: TuningGuideDTO }> = ({ guide }) => {
  const status = STATUS[guide.status];
  return (
    <Accordion defaultExpanded={guide.status === 'ADJUST'} disableGutters variant="outlined" slotProps={{ transition: { unmountOnExit: true } }}>
      <AccordionSummary expandIcon={<ExpandIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 600 }}>{guide.title}</Typography>
          <Chip size="small" label={status.label} color={status.color} variant={guide.status === 'NO_SIGNAL' ? 'outlined' : 'filled'} />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" sx={{ mb: guide.suggestions.length || guide.notes.length ? 1.5 : 0 }}>
          {guide.summary}
        </Typography>
        {guide.suggestions.length > 0 && (
          <List disablePadding sx={{ mb: guide.notes.length ? 1.5 : 0 }}>
            {guide.suggestions.map((suggestion) => (
              <ListItem key={`${suggestion.parameter}-${suggestion.axle}`} disableGutters sx={{ display: 'block', py: 1 }}>
                <Suggestion suggestion={suggestion} />
              </ListItem>
            ))}
          </List>
        )}
        {guide.notes.map((note) => (
          <Typography key={note} variant="caption" color="text.secondary" component="p">
            {note}
          </Typography>
        ))}
      </AccordionDetails>
    </Accordion>
  );
};

const Readiness: FC<{ recommendation: TuningRecommendationDTO }> = ({ recommendation }) => {
  const { readiness } = recommendation;
  const sessionsPercent = Math.min(100, Math.round((readiness.sessions / readiness.requiredSessions) * 100));
  const samplesPercent = Math.min(100, Math.round((readiness.samples / readiness.requiredSamples) * 100));
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
      <Typography variant="body2" component="p">{`${readiness.sessions} de ${readiness.requiredSessions} sessões`}</Typography>
      <LinearProgress variant="determinate" value={sessionsPercent} aria-label="Progresso de sessões" sx={{ height: 8, borderRadius: 4, mb: 1.5 }} />
      <Typography variant="body2" component="p">{`${formatNumber(readiness.samples, 0)} de ${formatNumber(readiness.requiredSamples, 0)} amostras`}</Typography>
      <LinearProgress variant="determinate" value={samplesPercent} aria-label="Progresso de amostras" sx={{ height: 8, borderRadius: 4 }} />
      {readiness.missing.map((message) => (
        <Alert key={message} severity="info" sx={{ mt: 1.5 }}>
          {message}
        </Alert>
      ))}
      {readiness.ready && recommendation.windowFrom && recommendation.windowTo && (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5 }}>
          {`Baseado em ${readiness.sessions} sessões, de ${formatSessionStart(recommendation.windowFrom)} a ${formatSessionStart(recommendation.windowTo)}.`}
          {recommendation.checkpointAt ? ` Coleta reiniciada em ${formatSessionStart(recommendation.checkpointAt)}.` : ''}
        </Typography>
      )}
    </Paper>
  );
};

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

            <Readiness recommendation={recommendation} />

            {recommendation.readiness.ready && (
              <>
                <Alert severity="info" sx={{ mb: 3 }}>
                  O Data Out do jogo não envia os valores do setup (nem peso e distribuição), por isso as sugestões indicam o <strong>sentido</strong> do ajuste
                  (aumentar ou reduzir), com a evidência medida. Faça no máximo 3 ajustes por ciclo, teste algumas voltas e depois use “Reiniciar coleta” para
                  medir o novo setup. Valores absolutos exigem peso e limites de interface do carro.
                </Alert>

                <Box component="section" aria-labelledby="ciclo-titulo" sx={{ mb: 4 }}>
                  <Typography id="ciclo-titulo" variant="h6" component="h3" sx={{ fontWeight: 600, mb: 1.5 }}>
                    Aplicar neste ciclo
                  </Typography>
                  {recommendation.thisCycle.length === 0 ? (
                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                      <Typography color="text.secondary">Nenhum ajuste necessário neste ciclo: as métricas coletadas estão dentro do esperado.</Typography>
                    </Paper>
                  ) : (
                    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                      <List>
                        {recommendation.thisCycle.map((suggestion) => (
                          <ListItem key={`${suggestion.guide}-${suggestion.parameter}`} divider sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                            <Chip size="small" color="primary" label={suggestion.priority} aria-label={`Prioridade ${suggestion.priority}`} />
                            <Suggestion suggestion={suggestion} />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  )}
                </Box>

                <Box component="section" aria-labelledby="guias-titulo">
                  <Typography id="guias-titulo" variant="h6" component="h3" sx={{ fontWeight: 600, mb: 1.5 }}>
                    Todas as guias de tuning
                  </Typography>
                  {recommendation.guides.map((guide) => (
                    <GuideAccordion key={guide.id} guide={guide} />
                  ))}
                </Box>
              </>
            )}
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

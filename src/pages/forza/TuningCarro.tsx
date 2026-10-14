import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Container, Paper, Tab, Tabs, Typography } from '@mui/material';
import { RestartAlt as ResetIcon, SportsMotorsports as ForzaIcon } from '@mui/icons-material';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import AppNavbar from '@/components/AppNavbar';
import ConfirmDialog from '@/components/ConfirmDialog';
import SetupForm from '@/components/forza/SetupForm';
import TuningRecommendation from '@/components/forza/TuningRecommendation';
import { useSnackbar } from '@/hooks/useSnackbar';
import { CarSetupDTO, CarSetupRequest, TuningRecommendationDTO } from '@/interfaces/forza';
import { applyCarSetup, deleteCarSetup, getCarSetup, getTuningRecommendation, resetTuningCollection, saveCarSetup } from '@/services/forzaApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { getProblemDetail } from '@/utils/errors';
import { carLabel, describeDrivetrain } from '@/utils/forza';

type LoadError = 'not-found' | 'generic' | null;
type TabId = 'recomendacao' | 'setup';

const TuningCarro: FC = () => {
  const { carOrdinal = '', performanceClass = '' } = useParams<{ carOrdinal: string; performanceClass: string }>();
  const ordinal = Number(carOrdinal);
  const api = useAxiosWithAuth();
  const { showSnackbar } = useSnackbar();

  const [recommendation, setRecommendation] = useState<TuningRecommendationDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);

  const [tab, setTab] = useState<TabId>('recomendacao');
  const tabChosen = useRef(false);
  const [setup, setSetup] = useState<CarSetupDTO | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const loaded = await getTuningRecommendation(api, ordinal, performanceClass, signal);
        setRecommendation(loaded);
        // Carro sem setup aceito: a coleta ainda não começou, então a primeira coisa é conferir e aceitar o setup.
        if (!tabChosen.current) {
          tabChosen.current = true;
          if (loaded.setupConfirmed === false) setTab('setup');
        }
      } catch (e) {
        if (axios.isCancel(e)) return;
        setError(axios.isAxiosError(e) && e.response?.status === 404 ? 'not-found' : 'generic');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [api, ordinal, performanceClass],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const loadSetup = useCallback(async () => {
    setSetupLoading(true);
    setSetupError(false);
    try {
      setSetup(await getCarSetup(api, ordinal, performanceClass));
    } catch {
      setSetupError(true);
    } finally {
      setSetupLoading(false);
    }
  }, [api, ordinal, performanceClass]);

  // O setup só é buscado quando a aba é aberta (ou ao voltar ao rascunho depois de apagar).
  useEffect(() => {
    if (tab === 'setup' && !setup && !setupLoading && !setupError) loadSetup();
  }, [tab, setup, setupLoading, setupError, loadSetup]);

  const reset = async () => {
    setConfirmReset(false);
    try {
      await resetTuningCollection(api, ordinal, performanceClass);
      showSnackbar(`Coleta reiniciada: só as próximas sessões deste carro na classe ${performanceClass} contam.`, 'success');
      await load();
    } catch {
      showSnackbar('Não foi possível reiniciar a coleta.', 'error');
    }
  };

  const save = async (request: CarSetupRequest) => {
    setSaving(true);
    const wasConfirmed = setup?.confirmed;
    try {
      setSetup(await saveCarSetup(api, ordinal, performanceClass, request));
      showSnackbar(wasConfirmed ? 'Setup salvo.' : 'Setup aceito: a coleta começa agora.', 'success');
      setTab('recomendacao');
      await load();
    } catch (e) {
      showSnackbar(getProblemDetail(e) ?? 'Não foi possível salvar o setup.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const apply = async () => {
    setConfirmApply(false);
    try {
      setSetup(await applyCarSetup(api, ordinal, performanceClass));
      showSnackbar('Valores gravados no setup: coleta reiniciada.', 'success');
      await load();
    } catch (e) {
      showSnackbar(getProblemDetail(e) ?? 'Não foi possível aplicar os ajustes.', 'error');
    }
  };

  const removeSetup = async () => {
    try {
      await deleteCarSetup(api, ordinal, performanceClass);
      showSnackbar('Setup apagado: confira e aceite um setup para voltar a coletar.', 'success');
      setSetup(null);
      setTab('setup');
      await load();
    } catch (e) {
      showSnackbar(getProblemDetail(e) ?? 'Não foi possível apagar o setup.', 'error');
    }
  };

  const title = recommendation ? carLabel(recommendation.carName, recommendation.carOrdinal) : '';
  const confirmed = recommendation?.setupConfirmed !== false;

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
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
                    <Chip size="small" label={`${recommendation.performanceClass} · PI ${recommendation.performanceIndex}`} />
                    <Chip size="small" label={describeDrivetrain(recommendation.drivetrain)} />
                    <Chip size="small" label={`#${recommendation.carOrdinal}`} variant="outlined" />
                    {!confirmed && <Chip size="small" color="warning" label="Setup a confirmar" />}
                  </Box>
                </Box>
                {confirmed && (
                  <Button variant="outlined" startIcon={<ResetIcon />} onClick={() => setConfirmReset(true)}>
                    Reiniciar coleta
                  </Button>
                )}
              </Box>
            </Paper>

            <Tabs value={tab} onChange={(_, value: TabId) => setTab(value)} aria-label="Seções do carro" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Tab value="recomendacao" label="Recomendação" id="tab-recomendacao" aria-controls="painel-recomendacao" />
              <Tab value="setup" label="Setup" id="tab-setup" aria-controls="painel-setup" />
            </Tabs>

            {tab === 'recomendacao' && (
              <Box role="tabpanel" id="painel-recomendacao" aria-labelledby="tab-recomendacao">
                <TuningRecommendation recommendation={recommendation} onApply={() => setConfirmApply(true)} />
              </Box>
            )}

            {tab === 'setup' && (
              <Box role="tabpanel" id="painel-setup" aria-labelledby="tab-setup">
                {setupLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                    <CircularProgress />
                  </Box>
                )}
                {!setupLoading && setupError && (
                  <Alert
                    severity="error"
                    action={
                      <Button color="inherit" size="small" onClick={() => loadSetup()}>
                        Tentar novamente
                      </Button>
                    }
                  >
                    Não foi possível carregar o setup.
                  </Alert>
                )}
                {!setupLoading && !setupError && setup && (
                  <SetupForm key={setup.confirmedAt ?? 'rascunho'} setup={setup} saving={saving} onSave={save} onDelete={removeSetup} />
                )}
              </Box>
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

      <ConfirmDialog
        open={confirmApply}
        title="Gravar os alvos como valores atuais?"
        message="Confirme que você já aplicou estes ajustes no jogo. Os alvos viram o setup atual do carro e a coleta reinicia: as sessões anteriores deixam de contar."
        confirmColor="warning"
        onConfirm={apply}
        onCancel={() => setConfirmApply(false)}
      />
    </Box>
  );
};

export default TuningCarro;

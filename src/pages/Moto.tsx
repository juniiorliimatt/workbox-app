import { FC, ReactNode, useCallback, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Container, MenuItem, Paper, Tab, Tabs, TextField } from '@mui/material';
import { TwoWheeler as MotoIcon } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import AppNavbar from '@/components/AppNavbar';
import AbastecimentosTab from '@/pages/moto/AbastecimentosTab';
import MotosTab from '@/pages/moto/MotosTab';
import OleoTab from '@/pages/moto/OleoTab';
import ResumoTab from '@/pages/moto/ResumoTab';
import { useMotos } from '@/pages/moto/useMotos';

const TABS = [
  { key: 'resumo', label: 'Resumo' },
  { key: 'abastecimentos', label: 'Abastecimentos' },
  { key: 'oleo', label: 'Óleo' },
  { key: 'motos', label: 'Motos' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const isTabKey = (value: string | null): value is TabKey => TABS.some((tab) => tab.key === value);

/**
 * Módulo Moto: abastecimentos, consumo, km rodados e troca de óleo, por moto. A aba fica em `?aba=` (link
 * compartilhável); sem nenhuma moto cadastrada só a aba "Motos" faz sentido.
 */
const Moto: FC = () => {
  const { motos, selected, select, reload, loading, error } = useMotos();
  const [searchParams, setSearchParams] = useSearchParams();
  // Muda quando algo que altera hodômetro/consumo/óleo foi gravado: as abas que dependem disso recarregam.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  const requested = searchParams.get('aba');
  const tab: TabKey = !selected ? 'motos' : isTabKey(requested) ? requested : 'resumo';

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar
        title="Workbox Moto"
        icon={<MotoIcon sx={{ mr: 0.5 }} />}
        showBackButton
        backPath="/dashboard"
        backLabel="Voltar aos Módulos"
      />

      <Container maxWidth="lg" sx={{ mt: 3, mb: 4, flexGrow: 1 }}>
        {loading && motos.length === 0 && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress aria-label="Carregando motos" />
          </Box>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => void reload()}>
                Tentar novamente
              </Button>
            }
          >
            Não foi possível carregar suas motos.
          </Alert>
        )}

        {!loading && !error && motos.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Cadastre sua primeira moto para começar a registrar abastecimentos e trocas de óleo.
          </Alert>
        )}

        {(motos.length > 0 || !loading) && !error && (
          <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 2,
                p: 2,
              }}
            >
              {selected && (
                <TextField
                  select
                  size="small"
                  label="Moto"
                  value={selected.id}
                  onChange={(event) => select(event.target.value)}
                  sx={{ minWidth: { sm: 260 } }}
                >
                  {motos.map((moto) => (
                    <MenuItem key={moto.id} value={moto.id}>
                      {moto.nickname} · {moto.model}
                      {moto.active ? '' : ' (inativa)'}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <Tabs
                value={tab}
                onChange={(_event, key: TabKey) => setSearchParams({ aba: key })}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="Seções do módulo Moto"
                sx={{ flexGrow: 1, minWidth: 0 }}
              >
                {TABS.map(({ key, label }) => (
                  <Tab
                    key={key}
                    value={key}
                    label={label}
                    id={`moto-tab-${key}`}
                    aria-controls={`moto-panel-${key}`}
                    disabled={!selected && key !== 'motos'}
                  />
                ))}
              </Tabs>
            </Box>

            <Box sx={{ p: { xs: 2, sm: 3 }, borderTop: 1, borderColor: 'divider' }}>
              {selected && (
                <>
                  <Panel tabKey="resumo" current={tab}>
                    <ResumoTab motorcycle={selected} active={tab === 'resumo'} refreshKey={refreshKey} onChanged={refresh} />
                  </Panel>
                  <Panel tabKey="abastecimentos" current={tab}>
                    <AbastecimentosTab motorcycle={selected} active={tab === 'abastecimentos'} onChanged={refresh} />
                  </Panel>
                  <Panel tabKey="oleo" current={tab}>
                    <OleoTab motorcycle={selected} active={tab === 'oleo'} refreshKey={refreshKey} onChanged={refresh} />
                  </Panel>
                </>
              )}
              <Panel tabKey="motos" current={tab}>
                <MotosTab
                  motos={motos}
                  onChanged={() => {
                    refresh();
                    void reload();
                  }}
                />
              </Panel>
            </Box>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

interface PanelProps {
  tabKey: TabKey;
  current: TabKey;
  children: ReactNode;
}

/** Painel de uma aba: todos ficam montados (só um visível), então o estado de cada aba sobrevive à troca. */
const Panel: FC<PanelProps> = ({ tabKey, current, children }) => (
  <Box role="tabpanel" id={`moto-panel-${tabKey}`} aria-labelledby={`moto-tab-${tabKey}`} hidden={tabKey !== current}>
    {children}
  </Box>
);

export default Moto;

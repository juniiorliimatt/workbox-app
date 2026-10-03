import { FC } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, LinearProgress, List, ListItem, Paper, Typography } from '@mui/material';
import { ArrowDownward as DownIcon, ArrowUpward as UpIcon, ExpandMore as ExpandIcon } from '@mui/icons-material';
import { TuningAxle, TuningGuideDTO, TuningGuideStatus, TuningRecommendationDTO, TuningSuggestionDTO } from '@/interfaces/forza';
import { formatNumber, formatSessionStart } from '@/utils/forza';

const AXLE_LABEL: Record<TuningAxle, string | null> = { FRONT: 'Dianteira', REAR: 'Traseira', BOTH: 'Ambos os eixos', NONE: null };

const STATUS: Record<TuningGuideStatus, { label: string; color: 'warning' | 'success' | 'default' }> = {
  ADJUST: { label: 'Ajustar', color: 'warning' },
  OK: { label: 'OK', color: 'success' },
  NO_SIGNAL: { label: 'Sem sinal na telemetria', color: 'default' },
};

/** O equilíbrio de freio é um deslocamento entre eixos, não um "aumentar/reduzir": o eixo da sugestão diz para onde. */
const isBrakeBalance = (suggestion: TuningSuggestionDTO) => suggestion.parameter.startsWith('Equilíbrio de freio');

const MAGNITUDE_LABEL = { SMALL: 'Passo pequeno', MEDIUM: 'Passo médio', LARGE: 'Passo grande' } as const;

/** Quantidade do passo na unidade do jogo ("0,5 cm", "0,2°", "5% do curso do slider"); vazio quando o serviço não sabe o passo. */
const stepText = (suggestion: TuningSuggestionDTO): string => {
  if (suggestion.amount == null || !suggestion.unit) return '';
  const amount = suggestion.amount.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const glued = suggestion.unit === '°' || suggestion.unit.startsWith('%');
  return glued ? `${amount}${suggestion.unit}` : `${amount} ${suggestion.unit}`;
};

/** Sentido (e quanto) em texto + ícone (a informação nunca fica só na cor). */
const Direction: FC<{ suggestion: TuningSuggestionDTO }> = ({ suggestion }) => {
  const step = stepText(suggestion);
  if (isBrakeBalance(suggestion)) {
    const toFront = suggestion.axle === 'FRONT';
    const target = toFront ? 'para a dianteira' : 'para a traseira';
    return (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700 }}>
        {toFront ? <UpIcon fontSize="small" aria-hidden /> : <DownIcon fontSize="small" aria-hidden />}
        {step ? `Mover ${step} ${target}` : `Mover ${target}`}
      </Box>
    );
  }
  const verb = suggestion.direction === 'INCREASE' ? 'Aumentar' : 'Reduzir';
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700 }}>
      {suggestion.direction === 'INCREASE' ? <UpIcon fontSize="small" aria-hidden /> : <DownIcon fontSize="small" aria-hidden />}
      {step ? `${verb} ${step}` : verb}
    </Box>
  );
};

const Suggestion: FC<{ suggestion: TuningSuggestionDTO }> = ({ suggestion }) => {
  const axle = AXLE_LABEL[suggestion.axle];
  const brake = isBrakeBalance(suggestion);
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography component="span" sx={{ fontWeight: 600 }}>
          {suggestion.parameter}
        </Typography>
        <Direction suggestion={suggestion} />
        {suggestion.magnitude && <Chip size="small" color="primary" variant="outlined" label={MAGNITUDE_LABEL[suggestion.magnitude]} />}
        {axle && !brake && <Chip size="small" variant="outlined" label={axle} />}
      </Box>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {suggestion.rationale}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
        Evidência: {suggestion.evidence}
      </Typography>
      {brake && (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
          Siga o sentido em palavras: no FH5 o slider de equilíbrio é invertido; no FH6 a direita é mais freio na dianteira.
        </Typography>
      )}
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

const windowText = (recommendation: TuningRecommendationDTO) =>
  recommendation.windowFrom && recommendation.windowTo
    ? `Baseado em ${recommendation.readiness.sessions} sessões, de ${formatSessionStart(recommendation.windowFrom)} a ${formatSessionStart(recommendation.windowTo)}.`
    : null;

const Readiness: FC<{ recommendation: TuningRecommendationDTO }> = ({ recommendation }) => {
  const { readiness } = recommendation;
  const sessionsPercent = Math.min(100, Math.round((readiness.sessions / readiness.requiredSessions) * 100));
  const samplesPercent = Math.min(100, Math.round((readiness.samples / readiness.requiredSamples) * 100));
  const basedOn = windowText(recommendation);
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
      {readiness.ready && basedOn && (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5 }}>
          {basedOn}
          {recommendation.checkpointAt ? ` Coleta reiniciada em ${formatSessionStart(recommendation.checkpointAt)}.` : ''}
        </Typography>
      )}
    </Paper>
  );
};

interface Props {
  recommendation: TuningRecommendationDTO;
  /** Foto salva no histórico: só leitura, sem barras de progresso da coleta nem instrução de reiniciar. */
  snapshot?: boolean;
}

/** Progresso da coleta, ajustes do ciclo e todas as guias de tuning de uma recomendação (ao vivo ou salva). */
const TuningRecommendation: FC<Props> = ({ recommendation, snapshot = false }) => {
  const basedOn = windowText(recommendation);
  return (
    <>
      {snapshot ? (
        basedOn && (
          <Typography variant="body2" color="text.secondary" component="p" sx={{ mb: 3 }}>
            {basedOn}
          </Typography>
        )
      ) : (
        <Readiness recommendation={recommendation} />
      )}

      {recommendation.readiness.ready && (
        <>
          <Alert severity="info" sx={{ mb: 3 }}>
            O Data Out do jogo não envia os valores do setup (nem peso e distribuição), por isso as sugestões indicam o <strong>sentido</strong> do ajuste
            (aumentar ou reduzir), com a evidência medida.
            {snapshot
              ? ' Valores absolutos exigem peso e limites de interface do carro.'
              : ' Faça no máximo 3 ajustes por ciclo, teste algumas voltas e depois use “Reiniciar coleta” para medir o novo setup. Valores absolutos exigem peso e limites de interface do carro.'}
          </Alert>

          <Box component="section" aria-labelledby="ciclo-titulo" sx={{ mb: 4 }}>
            <Typography id="ciclo-titulo" variant="h6" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
              Aplicar neste ciclo
            </Typography>
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1.5 }}>
              O passo é o tamanho da mudança deste ciclo, não o valor final: o jogo não envia o seu setup atual nem o curso dos sliders.
              {snapshot ? '' : ' Mude, teste 2–3 voltas e use “Reiniciar coleta”.'}
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
  );
};

export default TuningRecommendation;

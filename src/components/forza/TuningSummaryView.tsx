import { FC } from 'react';
import {
  Box,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { CornerPhaseStats, TuningSummary, Wheel } from '@/interfaces/forza';
import { formatDuration, formatNumber, formatPercent, formatTemperature } from '@/utils/forza';
import StatTile from '@/components/forza/StatTile';

const WHEELS: Wheel[] = ['FL', 'FR', 'RL', 'RR'];

const Section: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box component="section" sx={{ mb: 4 }}>
    <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 1.5 }}>
      {title}
    </Typography>
    {children}
  </Box>
);

const PhaseCard: FC<{ title: string; phase: CornerPhaseStats }> = ({ title, phase }) => (
  <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
    <Typography variant="subtitle2" component="h4" sx={{ fontWeight: 600, mb: 1 }}>
      {title}
    </Typography>
    {phase.samples === 0 ? (
      <Typography variant="body2" color="text.secondary">
        Sem dados
      </Typography>
    ) : (
      <Grid container spacing={1}>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary" component="p">
            Subesterço
          </Typography>
          <Typography component="p">{formatPercent(phase.understeerPct)}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary" component="p">
            Sobresterço
          </Typography>
          <Typography component="p">{formatPercent(phase.oversteerPct)}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary" component="p">
            Slip dianteiro (médio)
          </Typography>
          <Typography component="p">{formatNumber(phase.frontSlipAngleMean, 2)}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary" component="p">
            Slip traseiro (médio)
          </Typography>
          <Typography component="p">{formatNumber(phase.rearSlipAngleMean, 2)}</Typography>
        </Grid>
      </Grid>
    )}
  </Paper>
);

export interface ITuningSummaryViewProps {
  summary: TuningSummary;
}

/** Resumo de tuning de uma sessão (suspensão, curva, frenagem, tração, câmbio, pneus). */
const TuningSummaryView: FC<ITuningSummaryViewProps> = ({ summary }) => {
  const { suspension, speedKmh, engine, tires, cornerBalance, braking, traction } = summary;

  if (summary.samples === 0 || !suspension) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography color="text.secondary">Sem amostras suficientes para gerar o resumo desta sessão.</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Section title="Visão geral">
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <StatTile label="Duração" value={formatDuration(summary.durationS)} hint={`${formatNumber(summary.samples, 0)} amostras`} />
          </Grid>
          {speedKmh && (
            <>
              <Grid item xs={6} md={3}>
                <StatTile label="Velocidade máxima" value={`${formatNumber(speedKmh.max, 1)} km/h`} />
              </Grid>
              <Grid item xs={6} md={3}>
                <StatTile label="Velocidade média (em movimento)" value={`${formatNumber(speedKmh.meanMoving, 1)} km/h`} />
              </Grid>
            </>
          )}
          <Grid item xs={6} md={3}>
            <StatTile label="Tempo na zebra" value={formatPercent(summary.onRumbleStripPct)} />
          </Grid>
          {engine && (
            <>
              <Grid item xs={6} md={3}>
                <StatTile
                  label="Potência de pico"
                  value={`${formatNumber(engine.peakPowerHp, 1)} cv`}
                  hint={`@ ${formatNumber(engine.peakPowerRpm, 0)} rpm`}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <StatTile
                  label="Torque de pico"
                  value={`${formatNumber(engine.peakTorqueNm, 1)} N·m`}
                  hint={`@ ${formatNumber(engine.peakTorqueRpm, 0)} rpm`}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <StatTile label="Boost máximo" value={`${formatNumber(engine.boostMaxPsi, 1)} psi`} />
              </Grid>
              <Grid item xs={6} md={3}>
                <StatTile label="Rotação máxima" value={`${formatNumber(engine.maxRpm, 0)} rpm`} />
              </Grid>
            </>
          )}
        </Grid>
      </Section>

      <Section title="Suspensão">
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small" aria-label="Suspensão por roda">
            <TableHead>
              <TableRow>
                <TableCell>Roda</TableCell>
                <TableCell align="right">Curso médio</TableCell>
                <TableCell align="right">Curso P95</TableCell>
                <TableCell align="right">Fundo de curso</TableCell>
                <TableCell align="right">Topo de curso</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {WHEELS.map((wheel) => (
                <TableRow key={wheel}>
                  <TableCell component="th" scope="row">
                    {wheel}
                  </TableCell>
                  <TableCell align="right">{formatNumber(suspension[wheel].mean, 2)}</TableCell>
                  <TableCell align="right">{formatNumber(suspension[wheel].p95, 2)}</TableCell>
                  <TableCell align="right">{formatPercent(suspension[wheel].bottomingPct)}</TableCell>
                  <TableCell align="right">{formatPercent(suspension[wheel].toppingPct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
          Curso normalizado de 0 (totalmente estendida) a 1 (totalmente comprimida).
        </Typography>
      </Section>

      {cornerBalance && (
        <Section title="Equilíbrio em curva">
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <PhaseCard title="Entrada (freando)" phase={cornerBalance.entry} />
            </Grid>
            <Grid item xs={12} md={4}>
              <PhaseCard title="Meio da curva" phase={cornerBalance.mid} />
            </Grid>
            <Grid item xs={12} md={4}>
              <PhaseCard title="Saída (acelerando)" phase={cornerBalance.exit} />
            </Grid>
          </Grid>
          {cornerBalance.note && (
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
              {cornerBalance.note}
            </Typography>
          )}
        </Section>
      )}

      {braking && traction && (
        <Section title="Frenagem e tração">
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <StatTile label="Travamento dianteiro" value={formatPercent(braking.frontLockPct)} hint={`${formatNumber(braking.samples, 0)} amostras em frenagem forte`} />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatTile label="Travamento traseiro" value={formatPercent(braking.rearLockPct)} />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatTile label="Patinagem (rodas motrizes)" value={formatPercent(traction.drivenWheelSpinPct)} hint={`${formatNumber(traction.samples, 0)} amostras em aceleração`} />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatTile
                label="Patinagem por marcha"
                value={
                  Object.keys(traction.spinPctByGear).length === 0
                    ? '—'
                    : Object.entries(traction.spinPctByGear)
                        .map(([gear, pct]) => `${gear}ª ${formatPercent(pct)}`)
                        .join(' · ')
                }
              />
            </Grid>
          </Grid>
        </Section>
      )}

      {engine && Object.keys(engine.gears).length > 0 && (
        <Section title="Câmbio">
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small" aria-label="Uso das marchas">
              <TableHead>
                <TableRow>
                  <TableCell>Marcha</TableCell>
                  <TableCell align="right">Tempo</TableCell>
                  <TableCell align="right">RPM mediana</TableCell>
                  <TableCell align="right">No limitador (acelerando)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(engine.gears).map(([gear, stats]) => (
                  <TableRow key={gear}>
                    <TableCell component="th" scope="row">
                      {gear}
                    </TableCell>
                    <TableCell align="right">{formatPercent(stats.timePct)}</TableCell>
                    <TableCell align="right">{formatNumber(stats.rpmP50, 0)}</TableCell>
                    <TableCell align="right">{formatPercent(stats.limiterWithThrottlePct)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Section>
      )}

      {tires && (
        <Section title="Pneus">
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small" aria-label="Pneus por roda">
              <TableHead>
                <TableRow>
                  <TableCell>Roda</TableCell>
                  <TableCell align="right">Temperatura média</TableCell>
                  <TableCell align="right">Temperatura P95</TableCell>
                  <TableCell align="right">Desgaste final</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {WHEELS.map((wheel) => (
                  <TableRow key={wheel}>
                    <TableCell component="th" scope="row">
                      {wheel}
                    </TableCell>
                    <TableCell align="right" title={`${formatNumber(tires[wheel].tempMeanF, 1)} °F`}>
                      {formatTemperature(tires[wheel].tempMeanF)}
                    </TableCell>
                    <TableCell align="right" title={`${formatNumber(tires[wheel].tempP95F, 1)} °F`}>
                      {formatTemperature(tires[wheel].tempP95F)}
                    </TableCell>
                    <TableCell align="right">{formatNumber(tires[wheel].wearFinal, 3)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
            Temperaturas convertidas de °F (unidade do jogo) para °C; passe o mouse para ver o valor original. Desgaste só existe no Forza
            Motorsport.
          </Typography>
        </Section>
      )}
    </Box>
  );
};

export default TuningSummaryView;

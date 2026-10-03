import { FC, useMemo } from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SampleDTO } from '@/interfaces/forza';
import { decimate, formatNumber } from '@/utils/forza';

/** Máximo de pontos desenhados por gráfico — acima disso o SVG do recharts fica pesado. */
export const MAX_CHART_POINTS = 1000;

const PEDAL_MAX = 255;

export interface ITelemetryChartsProps {
  samples: SampleDTO[];
}

const ChartCard: FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
      {title}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
      {description}
    </Typography>
    <Box sx={{ width: '100%', height: 280 }}>{children}</Box>
  </Paper>
);

/** Velocidade/rotação e pedais ao longo da sessão (série decimada para o gráfico). */
const TelemetryCharts: FC<ITelemetryChartsProps> = ({ samples }) => {
  const theme = useTheme();

  const data = useMemo(
    () =>
      decimate(samples, MAX_CHART_POINTS).map((s) => ({
        t: Math.round(s.tMs / 100) / 10,
        kmh: Math.round(s.speed * 3.6 * 10) / 10,
        rpm: Math.round(s.rpm),
        acelerador: Math.round((s.accel / PEDAL_MAX) * 100),
        freio: Math.round((s.brake / PEDAL_MAX) * 100),
      })),
    [samples],
  );

  const fmt = (value: number | string) => formatNumber(Number(value), 0);

  return (
    <>
      <ChartCard title="Velocidade e rotação" description="Velocidade (km/h, eixo esquerdo) e rotação do motor (rpm, eixo direito) pelo tempo de sessão, em segundos.">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={fmt} unit=" s" />
            <YAxis yAxisId="kmh" tickFormatter={fmt} />
            <YAxis yAxisId="rpm" orientation="right" tickFormatter={fmt} />
            <Tooltip />
            <Legend />
            <Line yAxisId="kmh" type="monotone" dataKey="kmh" name="Velocidade (km/h)" stroke={theme.palette.primary.main} dot={false} isAnimationActive={false} />
            <Line yAxisId="rpm" type="monotone" dataKey="rpm" name="Rotação (rpm)" stroke={theme.palette.secondary.main} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Pedais" description="Acelerador e freio em porcentagem do curso, pelo tempo de sessão, em segundos.">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={fmt} unit=" s" />
            <YAxis domain={[0, 100]} unit="%" />
            <Tooltip />
            <Legend />
            <Line type="stepAfter" dataKey="acelerador" name="Acelerador (%)" stroke={theme.palette.success.main} dot={false} isAnimationActive={false} />
            <Line type="stepAfter" dataKey="freio" name="Freio (%)" stroke={theme.palette.error.main} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
};

export default TelemetryCharts;

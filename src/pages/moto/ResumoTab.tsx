import { FC, ReactElement, ReactNode, useId, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { Speed as SpeedIcon } from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import dayjs, { Dayjs } from 'dayjs';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import * as yup from 'yup';
import useLazyTabData from '@/hooks/useLazyTabData';
import { useSnackbar } from '@/hooks/useSnackbar';
import { IMonthlyStats, IMotorcycle, IOilStatus, IStats, IYearlyStats } from '@/interfaces/moto';
import { errorMessage } from '@/pages/moto/errors';
import {
  MONTH_NAMES,
  MONTH_SHORT,
  OIL_LEVEL_LABEL,
  formatKm,
  formatKmPerDay,
  formatKmPerLiter,
  formatLiters,
  formatPct,
  formatPerKm,
  formatPerLiter,
  formatRemainingDays,
  formatRemainingKm,
  pluralize,
} from '@/pages/moto/format';
import { createOdometerReading, getMonthlyStats, getOilStatus, getStats, getYearlyStats } from '@/services/motoApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { formatCurrency } from '@/utils/format';

export interface ResumoTabProps {
  motorcycle: IMotorcycle;
  /** Só a aba visível busca dados. */
  active: boolean;
  /** Muda quando outro lugar alterou abastecimentos, trocas ou hodômetro: força recarregar as métricas. */
  refreshKey: number;
  /** Avisa que o hodômetro mudou (o diálogo "Atualizar km" grava uma leitura avulsa). */
  onChanged: () => void;
}

const ISO = 'YYYY-MM-DD';
const LOW_CONFIDENCE_HINT = 'Poucos abastecimentos no período: a média pode variar';

interface Overview {
  overall: IStats;
  month: IStats;
  yearly: IYearlyStats[];
  oil: IOilStatus;
}

interface StatCardProps {
  title: string;
  value: string;
  /** Linhas de apoio sob o valor. */
  lines?: ReactNode[];
  extra?: ReactNode;
}

/** Card de indicador: grupo nomeado pelo título (leitores de tela anunciam "Consumo médio, grupo"). */
const StatCard: FC<StatCardProps> = ({ title, value, lines = [], extra }) => {
  const id = useId();
  return (
    <Paper variant="outlined" component="section" role="group" aria-labelledby={id} sx={{ p: 2, height: '100%' }}>
      <Typography id={id} variant="overline" component="h3" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h5" component="p" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
        {value}
      </Typography>
      {lines.map((line, index) => (
        <Typography key={index} variant="body2" color="text.secondary">
          {line}
        </Typography>
      ))}
      {extra}
    </Paper>
  );
};

interface ChartCardProps {
  title: string;
  /** O gráfico do recharts (o `ResponsiveContainer` exige um único elemento filho). */
  children: ReactElement;
  /** Cabeçalhos e linhas da tabela equivalente (para leitores de tela: o gráfico em si é decorativo). */
  tableHeaders: [string, string];
  tableRows: [string, string][];
}

/** O gráfico é só visual (`aria-hidden`); a mesma informação vai numa tabela visualmente oculta. */
const ChartCard: FC<ChartCardProps> = ({ title, children, tableHeaders, tableRows }) => (
  <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
      {title}
    </Typography>
    <Box aria-hidden="true" sx={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </Box>
    <Table aria-label={title} sx={visuallyHidden}>
      <TableHead>
        <TableRow>
          <TableCell>{tableHeaders[0]}</TableCell>
          <TableCell>{tableHeaders[1]}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {tableRows.map(([label, value]) => (
          <TableRow key={label}>
            <TableCell>{label}</TableCell>
            <TableCell>{value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Paper>
);

const odometerSchema = yup.object().shape({
  odometerKm: yup
    .string()
    .trim()
    .required('Hodômetro é obrigatório')
    .matches(/^-?\d+$/, 'Informe um número inteiro')
    .test('nao-negativo', 'Hodômetro não pode ser negativo', (value) => !value || !value.startsWith('-')),
});

const oilCardLines = (oil: IOilStatus): ReactNode[] => {
  if (!oil.lastChange || oil.kmRemaining === null || oil.daysRemaining === null) {
    return [`Hodômetro atual: ${formatKm(oil.currentOdometerKm)}`];
  }
  return [oil.limitedBy === 'TIME' ? formatRemainingDays(oil.daysRemaining) : formatRemainingKm(oil.kmRemaining)];
};

/**
 * Resumo da moto: indicadores (consumo, km, gasto, custo por km, próxima troca) e gráficos mês a mês. km/l e custo por
 * km são ponderados no servidor; com poucos abastecimentos a média leva o selo "Baixa confiança".
 */
const ResumoTab: FC<ResumoTabProps> = ({ motorcycle, active, refreshKey, onChanged }) => {
  const api = useAxiosWithAuth();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const now = dayjs();
  const currentYear = now.year();
  const [year, setYear] = useState(currentYear);
  // Só pra "Tentar novamente": a chave de carga muda e o hook busca de novo.
  const [retry, setRetry] = useState(0);

  const overview = useLazyTabData<Overview>(
    active,
    `${motorcycle.id}|${refreshKey}|${retry}`,
    async (signal) => {
      const month = { from: now.startOf('month').format(ISO), to: now.endOf('month').format(ISO) };
      const [overall, monthStats, yearly, oil] = await Promise.all([
        getStats(api, motorcycle.id, {}, signal),
        getStats(api, motorcycle.id, month, signal),
        getYearlyStats(api, motorcycle.id, signal),
        getOilStatus(api, motorcycle.id, signal),
      ]);
      return { overall, month: monthStats, yearly, oil };
    },
    () => showSnackbar('Erro ao carregar métricas', 'error'),
  );
  const monthly = useLazyTabData<IMonthlyStats[]>(
    active,
    `${motorcycle.id}|${year}|${refreshKey}|${retry}`,
    (signal) => getMonthlyStats(api, motorcycle.id, year, signal),
    () => showSnackbar('Erro ao carregar a série mensal', 'error'),
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [date, setDate] = useState<Dayjs | null>(() => dayjs());
  const [dateError, setDateError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ odometerKm: string }>({ resolver: yupResolver(odometerSchema), defaultValues: { odometerKm: '' } });

  const openDialog = () => {
    reset({ odometerKm: overview.data?.oil.currentOdometerKm.toString() ?? '' });
    setDate(dayjs());
    setDateError(null);
    setDialogOpen(true);
  };

  const onSubmit = async ({ odometerKm }: { odometerKm: string }) => {
    if (!date || !date.isValid()) {
      setDateError('Data é obrigatória');
      return;
    }
    try {
      await createOdometerReading(api, motorcycle.id, { date: date.format(ISO), odometerKm: Number(odometerKm) });
      showSnackbar('Km atualizado!', 'success');
      setDialogOpen(false);
      onChanged();
    } catch (e) {
      showSnackbar(errorMessage(e, 'Erro ao atualizar km'), 'error');
    }
  };

  const failed = overview.error;
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const series = (monthly.data ?? []).map((m) => ({ name: MONTH_SHORT[m.month - 1], label: MONTH_NAMES[m.month - 1], stats: m.stats }));
  const hasYearData = series.some((point) => point.stats.km > 0 || point.stats.totalSpent > 0);
  const currentMonthChange = year === currentYear ? (monthly.data?.[now.month()]?.spentChangePct ?? null) : null;

  const overall = overview.data?.overall;
  const lowConfidence = Boolean(overall && overall.kmPerLiter !== null && overall.lowConfidence);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h6" component="h2">
          Resumo
        </Typography>
        <Button variant="outlined" startIcon={<SpeedIcon />} onClick={openDialog} disabled={!overview.data}>
          Atualizar km
        </Button>
      </Box>

      {failed && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => setRetry((n) => n + 1)}>Tentar novamente</Button>}>
          Não foi possível carregar as métricas.
        </Alert>
      )}

      {!failed && overview.data === null && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Carregando métricas" />
        </Box>
      )}

      {!failed && overview.data && overall && (
        <>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Consumo médio"
                value={formatKmPerLiter(overall.kmPerLiter)}
                lines={[
                  overall.kmPerLiter !== null && pluralize(overall.segmentCount, 'trecho', 'trechos'),
                  overall.bestKmPerLiter !== null && overall.worstKmPerLiter !== null &&
                    `Melhor ${formatKmPerLiter(overall.bestKmPerLiter)} · Pior ${formatKmPerLiter(overall.worstKmPerLiter)}`,
                ].filter(Boolean)}
                extra={
                  lowConfidence && (
                    <Tooltip title={LOW_CONFIDENCE_HINT}>
                      <Chip size="small" color="warning" variant="outlined" label="Baixa confiança" sx={{ mt: 1 }} />
                    </Tooltip>
                  )
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Km rodados" value={formatKm(overall.km)} lines={[formatKmPerDay(overall.kmPerDay)]} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Km no mês"
                value={formatKm(overview.data.month.km)}
                lines={[`${MONTH_NAMES[now.month()]} de ${currentYear}`]}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Gasto no mês"
                value={formatCurrency(overview.data.month.totalSpent)}
                lines={[
                  `${formatLiters(overview.data.month.litersRefueled)} abastecidos`,
                  currentMonthChange !== null && `${formatPct(currentMonthChange)} vs. mês anterior`,
                ].filter(Boolean)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Gasto no ano"
                value={formatCurrency(overview.data.yearly.find((y) => y.year === currentYear)?.stats.totalSpent ?? 0)}
                lines={[String(currentYear)]}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Custo por km"
                value={formatPerKm(overall.costPerKm)}
                lines={[`Preço médio do litro: ${formatPerLiter(overall.pricePerLiter)}`]}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Próxima troca de óleo"
                value={overview.data.oil.level ? OIL_LEVEL_LABEL[overview.data.oil.level] : 'Sem troca registrada'}
                lines={oilCardLines(overview.data.oil)}
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6" component="h2">
              Mês a mês
            </Typography>
            <TextField select size="small" label="Ano" value={year} onChange={(event) => setYear(Number(event.target.value))} sx={{ minWidth: 100 }}>
              {yearOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {monthly.data === null && !monthly.error && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} aria-label="Carregando série mensal" />
            </Box>
          )}

          {monthly.data !== null && !hasYearData && <Typography color="text.secondary">Sem abastecimentos em {year}</Typography>}

          {monthly.data !== null && hasYearData && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <ChartCard
                  title="Consumo por mês (km/l)"
                  tableHeaders={['Mês', 'Consumo']}
                  tableRows={series.map((point) => [point.label, formatKmPerLiter(point.stats.kmPerLiter)])}
                >
                  <LineChart data={series.map((point) => ({ name: point.name, value: point.stats.kmPerLiter }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip formatter={(value) => formatKmPerLiter(Number(value))} />
                    <Line type="monotone" dataKey="value" name="Consumo" stroke={theme.palette.primary.main} strokeWidth={2} connectNulls={false} />
                  </LineChart>
                </ChartCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <ChartCard
                  title="Gasto por mês (R$)"
                  tableHeaders={['Mês', 'Gasto']}
                  tableRows={series.map((point) => [point.label, formatCurrency(point.stats.totalSpent)])}
                >
                  <BarChart data={series.map((point) => ({ name: point.name, value: point.stats.totalSpent }))} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="value" name="Gasto" fill={theme.palette.secondary.main} />
                  </BarChart>
                </ChartCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <ChartCard
                  title="Km rodados por mês"
                  tableHeaders={['Mês', 'Km rodados']}
                  tableRows={series.map((point) => [point.label, formatKm(point.stats.km)])}
                >
                  <BarChart data={series.map((point) => ({ name: point.name, value: point.stats.km }))} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip formatter={(value) => formatKm(Number(value))} />
                    <Bar dataKey="value" name="Km rodados" fill={theme.palette.success.main} />
                  </BarChart>
                </ChartCard>
              </Grid>
              {overview.data.yearly.length > 1 && (
                <Grid item xs={12} md={6}>
                  <ChartCard
                    title="Por ano"
                    tableHeaders={['Ano', 'Km rodados']}
                    tableRows={overview.data.yearly.map((entry) => [String(entry.year), formatKm(entry.stats.km)])}
                  >
                    <BarChart data={overview.data.yearly.map((entry) => ({ name: String(entry.year), value: entry.stats.km }))} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip formatter={(value) => formatKm(Number(value))} />
                      <Bar dataKey="value" name="Km rodados" fill={theme.palette.info.main} />
                    </BarChart>
                  </ChartCard>
                </Grid>
              )}
            </Grid>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs" aria-labelledby="atualizar-km-title">
        <DialogTitle id="atualizar-km-title">Atualizar km</DialogTitle>
        <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Informe o hodômetro total da moto hoje, sem precisar abastecer. Os km rodados passam a contar na hora.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Data"
                  value={date}
                  onChange={(next) => {
                    setDate(next);
                    setDateError(null);
                  }}
                  disableFuture
                  slotProps={{ textField: { fullWidth: true, required: true, error: Boolean(dateError), helperText: dateError } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Hodômetro (km)"
                  required
                  fullWidth
                  autoFocus
                  inputProps={{ inputMode: 'numeric' }}
                  {...register('odometerKm')}
                  error={Boolean(errors.odometerKm)}
                  helperText={errors.odometerKm?.message}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="inherit" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Salvar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default ResumoTab;

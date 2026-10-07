import { FC, useCallback, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import dayjs, { Dayjs } from 'dayjs';
import * as yup from 'yup';
import ConfirmDialog from '@/components/ConfirmDialog';
import useLazyTabData from '@/hooks/useLazyTabData';
import { useSnackbar } from '@/hooks/useSnackbar';
import { IMotorcycle, IOilChange, IOilChangeRequest, IOilInterval, IOilStatus, OilLevel, OilType } from '@/interfaces/moto';
import { errorMessage } from '@/pages/moto/errors';
import { RecordCard, RecordList } from '@/pages/moto/RecordList';
import { useCompactLayout } from '@/pages/moto/useCompactLayout';
import { OIL_LEVEL_LABEL, OIL_TYPE_LABEL, formatDate, formatKm, formatRemainingDays, formatRemainingKm, pluralize } from '@/pages/moto/format';
import { createOilChange, deleteOilChange, getOilStatus, listOilChanges, listOilIntervals, updateOilChange } from '@/services/motoApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { formatCurrency } from '@/utils/format';

export interface OleoTabProps {
  motorcycle: IMotorcycle;
  /** Só a aba visível busca dados. */
  active: boolean;
  /** Muda quando outro lugar alterou o hodômetro (ex.: um abastecimento): força recarregar a próxima troca. */
  refreshKey: number;
  /** Avisa que uma troca de óleo mudou. */
  onChanged: () => void;
}

const ISO = 'YYYY-MM-DD';
const DEFAULT_TYPE: OilType = 'SEMI_SYNTHETIC';
const ALERT_SEVERITY: Record<OilLevel, 'success' | 'warning' | 'error'> = { OK: 'success', PERTO: 'warning', VENCIDA: 'error' };
const PROGRESS_COLOR: Record<OilLevel, 'success' | 'warning' | 'error'> = ALERT_SEVERITY;

/** Os campos numéricos ficam como texto no formulário (aceitam vírgula, sem setas do browser) e são convertidos no envio. */
interface FormValues {
  odometerKm: string;
  oilType: OilType;
  brand: string;
  viscosity: string;
  cost: string;
  intervalKm: string;
  intervalMonths: string;
}

const intField = (required: string, notPositive: string) =>
  yup
    .string()
    .trim()
    .required(required)
    .matches(/^\d+$/, notPositive)
    .test('positivo', notPositive, (value) => !value || Number(value) > 0);

const schema = yup.object().shape({
  odometerKm: yup
    .string()
    .trim()
    .required('Hodômetro é obrigatório')
    .matches(/^-?\d+$/, 'Informe um número inteiro')
    .test('nao-negativo', 'Hodômetro não pode ser negativo', (value) => !value || !value.startsWith('-')),
  oilType: yup.mixed<OilType>().oneOf(Object.keys(OIL_TYPE_LABEL) as OilType[]).default(DEFAULT_TYPE),
  brand: yup.string().trim().max(60, 'Máximo de 60 caracteres').default(''),
  viscosity: yup.string().trim().max(20, 'Máximo de 20 caracteres').default(''),
  cost: yup
    .string()
    .trim()
    .default('')
    .test('custo', 'Custo inválido', (value) => !value || /^\d+([.,]\d{1,2})?$/.test(value)),
  intervalKm: intField('Intervalo em km é obrigatório', 'Intervalo em km deve ser maior que zero'),
  intervalMonths: intField('Intervalo em meses é obrigatório', 'Intervalo em meses deve ser maior que zero'),
});

const emptyValues = (currentOdometerKm: number | undefined, intervals: IOilInterval[] | null | undefined): FormValues => {
  const preset = intervals?.find((interval) => interval.type === DEFAULT_TYPE);
  return {
    odometerKm: currentOdometerKm?.toString() ?? '',
    oilType: DEFAULT_TYPE,
    brand: '',
    viscosity: '',
    cost: '',
    intervalKm: preset?.defaultKm.toString() ?? '',
    intervalMonths: preset?.defaultMonths.toString() ?? '',
  };
};

const toFormValues = (change: IOilChange): FormValues => ({
  odometerKm: change.odometerKm.toString(),
  oilType: change.oilType,
  brand: change.brand ?? '',
  viscosity: change.viscosity ?? '',
  cost: change.cost?.toString() ?? '',
  intervalKm: change.intervalKm.toString(),
  intervalMonths: change.intervalMonths.toString(),
});

const clampPercent = (value: number): number => Math.round(Math.min(100, Math.max(0, value)));

/** `Semissintético · Motul 10W-40`: tipo do óleo e, se houver, marca e viscosidade. */
const changeLabel = (change: IOilChange): string =>
  [OIL_TYPE_LABEL[change.oilType], [change.brand, change.viscosity].filter(Boolean).join(' ')].filter(Boolean).join(' · ');

interface ProgressRowProps {
  label: string;
  percent: number;
  level: OilLevel;
  text: string;
}

/** Barra de progresso do intervalo com o texto ao lado: o estado nunca depende só da cor. */
const ProgressRow: FC<ProgressRowProps> = ({ label, percent, level, text }) => (
  <Box sx={{ mt: 1.5 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{text}</Typography>
    </Box>
    <LinearProgress variant="determinate" value={percent} color={PROGRESS_COLOR[level]} aria-label={`Progresso ${label.toLowerCase()}`} sx={{ height: 8, borderRadius: 4, mt: 0.5 }} />
  </Box>
);

const NextChange: FC<{ status: IOilStatus; onRegister: () => void }> = ({ status, onRegister }) => {
  const { lastChange, level } = status;
  if (!lastChange || !level || status.dueKm === null || status.dueDate === null || status.kmRemaining === null || status.daysRemaining === null) {
    return (
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Nenhuma troca registrada</Typography>
        <Typography variant="body2" color="text.secondary">
          Hodômetro atual: {formatKm(status.currentOdometerKm)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Registre a última troca para acompanhar a próxima.
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onRegister}>Registrar primeira troca</Button>
      </Box>
    );
  }

  const kmPercent = clampPercent(((status.currentOdometerKm - lastChange.odometerKm) / lastChange.intervalKm) * 100);
  const totalDays = dayjs(status.dueDate).diff(dayjs(lastChange.date), 'day');
  const timePercent = totalDays > 0 ? clampPercent((1 - status.daysRemaining / totalDays) * 100) : 100;

  return (
    <Box>
      <Alert severity={ALERT_SEVERITY[level]}>
        <AlertTitle>{OIL_LEVEL_LABEL[level]}</AlertTitle>
        Próxima troca em {formatKm(status.dueKm)} ou até {formatDate(status.dueDate)}, o que vier primeiro.
      </Alert>
      <ProgressRow label="Por km" percent={kmPercent} level={level} text={formatRemainingKm(status.kmRemaining)} />
      <ProgressRow label="Por tempo" percent={timePercent} level={level} text={formatRemainingDays(status.daysRemaining)} />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        Vence primeiro por {status.limitedBy === 'TIME' ? 'tempo' : 'km'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Hodômetro atual: {formatKm(status.currentOdometerKm)}
      </Typography>
    </Box>
  );
};

/**
 * Troca de óleo: próxima troca (km e tempo, o que vencer primeiro), histórico e formulário. O intervalo é o que o usuário
 * escolhe na troca; o padrão por tipo de óleo (`/oil-intervals`) só pré-preenche o formulário.
 */
const OleoTab: FC<OleoTabProps> = ({ motorcycle, active, refreshKey, onChanged }) => {
  const api = useAxiosWithAuth();
  const { showSnackbar } = useSnackbar();
  // Muda a chave de carga depois de gravar/excluir: o hook só recarrega quando a chave muda.
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((current) => current + 1), []);
  const compact = useCompactLayout();

  const { data, error } = useLazyTabData(
    active,
    `${motorcycle.id}|${refreshKey}|${version}`,
    async (signal) => {
      const [status, changes] = await Promise.all([getOilStatus(api, motorcycle.id, signal), listOilChanges(api, motorcycle.id, signal)]);
      return { status, changes };
    },
    () => showSnackbar('Erro ao carregar dados do óleo', 'error'),
  );
  // Sem os padrões (falha de rede) o formulário continua utilizável: o usuário digita o intervalo.
  const { data: intervals } = useLazyTabData(active, 'intervals', (signal) => listOilIntervals(api, signal));

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IOilChange | null>(null);
  const [date, setDate] = useState<Dayjs | null>(() => dayjs());
  const [dateError, setDateError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<IOilChange | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: yupResolver(schema), defaultValues: emptyValues(undefined, null) });

  const selectedInterval = intervals?.find((interval) => interval.type === watch('oilType'));

  const openNew = () => {
    setEditing(null);
    reset(emptyValues(data?.status.currentOdometerKm, intervals));
    setDate(dayjs());
    setDateError(null);
    setFormOpen(true);
  };

  const openEdit = (change: IOilChange) => {
    setEditing(change);
    reset(toFormValues(change));
    setDate(dayjs(change.date));
    setDateError(null);
    setFormOpen(true);
  };

  const applyIntervalPreset = (type: OilType) => {
    const preset = intervals?.find((interval) => interval.type === type);
    if (!preset) return;
    setValue('intervalKm', preset.defaultKm.toString(), { shouldValidate: false });
    setValue('intervalMonths', preset.defaultMonths.toString(), { shouldValidate: false });
  };

  const onSubmit = async (values: FormValues) => {
    if (!date || !date.isValid()) {
      setDateError('Data é obrigatória');
      return;
    }
    const body: IOilChangeRequest = {
      date: date.format(ISO),
      odometerKm: Number(values.odometerKm),
      oilType: values.oilType,
      brand: values.brand.trim() || null,
      viscosity: values.viscosity.trim() || null,
      cost: values.cost.trim() ? Number(values.cost.replace(',', '.')) : null,
      intervalKm: Number(values.intervalKm),
      intervalMonths: Number(values.intervalMonths),
    };
    try {
      if (editing) {
        await updateOilChange(api, motorcycle.id, editing.id, body);
        showSnackbar('Troca de óleo atualizada!', 'success');
      } else {
        await createOilChange(api, motorcycle.id, body);
        showSnackbar('Troca de óleo registrada!', 'success');
      }
      setFormOpen(false);
      reload();
      onChanged();
    } catch (e) {
      showSnackbar(errorMessage(e, 'Erro ao salvar troca de óleo'), 'error');
    }
  };

  const renderActions = (change: IOilChange) => (
    <>
      <IconButton size="small" aria-label={`Editar troca de óleo de ${formatDate(change.date)}`} onClick={() => openEdit(change)}>
        <EditIcon fontSize="small" />
      </IconButton>
      <IconButton size="small" color="error" aria-label={`Excluir troca de óleo de ${formatDate(change.date)}`} onClick={() => setToDelete(change)}>
        <DeleteIcon fontSize="small" />
      </IconButton>
    </>
  );

  const confirmDelete = async () => {
    if (!toDelete) return;
    const change = toDelete;
    setToDelete(null);
    try {
      await deleteOilChange(api, motorcycle.id, change.id);
      showSnackbar('Troca de óleo excluída!', 'success');
      reload();
      onChanged();
    } catch (e) {
      showSnackbar(errorMessage(e, 'Erro ao excluir troca de óleo'), 'error');
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={reload}>Tentar novamente</Button>}>
          Não foi possível carregar os dados do óleo.
        </Alert>
      )}

      {!error && data === null && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Carregando dados do óleo" />
        </Box>
      )}

      {!error && data !== null && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6" component="h2">Próxima troca</Typography>
            {data.status.lastChange && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>Registrar troca</Button>
            )}
          </Box>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 4 }}>
            <NextChange status={data.status} onRegister={openNew} />
          </Paper>

          {data.changes.length > 0 && (
            <>
              <Typography variant="h6" component="h2" sx={{ mb: 1 }}>Histórico</Typography>
              {compact ? (
                <RecordList label="Histórico de trocas de óleo">
                  {data.changes.map((change) => (
                    <RecordCard
                      key={change.id}
                      title={`${formatDate(change.date)} · ${formatKm(change.odometerKm)}`}
                      lines={[
                        changeLabel(change),
                        [`${formatKm(change.intervalKm)} / ${pluralize(change.intervalMonths, 'mês', 'meses')}`, change.cost === null ? null : formatCurrency(change.cost)]
                          .filter(Boolean)
                          .join(' · '),
                      ]}
                      actions={renderActions(change)}
                    />
                  ))}
                </RecordList>
              ) : (
              <TableContainer sx={{ position: 'relative' }}>
                <Table size="small" aria-label="Histórico de trocas de óleo">
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell align="right">Hodômetro</TableCell>
                      <TableCell>Óleo</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Intervalo</TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Custo</TableCell>
                      <TableCell align="right">
                        <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Ações</span>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.changes.map((change) => (
                      <TableRow key={change.id} hover>
                        <TableCell>{formatDate(change.date)}</TableCell>
                        <TableCell align="right">{formatKm(change.odometerKm)}</TableCell>
                        <TableCell>{changeLabel(change)}</TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          {formatKm(change.intervalKm)} / {pluralize(change.intervalMonths, 'mês', 'meses')}
                        </TableCell>
                        <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          {change.cost === null ? '—' : formatCurrency(change.cost)}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{renderActions(change)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              )}
            </>
          )}
        </>
      )}

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm" aria-labelledby="oleo-form-title">
        <DialogTitle id="oleo-form-title">{editing ? 'Editar troca de óleo' : 'Registrar troca de óleo'}</DialogTitle>
        <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
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
                  inputProps={{ inputMode: 'numeric' }}
                  {...register('odometerKm')}
                  error={Boolean(errors.odometerKm)}
                  helperText={errors.odometerKm?.message ?? 'Hodômetro total da moto na troca'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="oilType"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      label="Tipo de óleo"
                      fullWidth
                      {...field}
                      onChange={(event) => {
                        field.onChange(event);
                        applyIntervalPreset(event.target.value as OilType);
                      }}
                    >
                      {(Object.keys(OIL_TYPE_LABEL) as OilType[]).map((type) => (
                        <MenuItem key={type} value={type}>{OIL_TYPE_LABEL[type]}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Marca" fullWidth {...register('brand')} error={Boolean(errors.brand)} helperText={errors.brand?.message} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Viscosidade" fullWidth {...register('viscosity')} error={Boolean(errors.viscosity)} helperText={errors.viscosity?.message} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Intervalo (km)"
                  required
                  fullWidth
                  inputProps={{ inputMode: 'numeric' }}
                  {...register('intervalKm')}
                  error={Boolean(errors.intervalKm)}
                  helperText={
                    errors.intervalKm?.message ??
                    (selectedInterval ? `Sugerido: ${selectedInterval.minKm.toLocaleString('pt-BR')} a ${selectedInterval.maxKm.toLocaleString('pt-BR')} km` : undefined)
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Intervalo (meses)"
                  required
                  fullWidth
                  inputProps={{ inputMode: 'numeric' }}
                  {...register('intervalMonths')}
                  error={Boolean(errors.intervalMonths)}
                  helperText={errors.intervalMonths?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Custo (R$)"
                  fullWidth
                  inputProps={{ inputMode: 'decimal' }}
                  {...register('cost')}
                  error={Boolean(errors.cost)}
                  helperText={errors.cost?.message}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="inherit" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>Salvar</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        title="Excluir troca de óleo"
        message={toDelete ? `Excluir a troca de óleo de ${formatDate(toDelete.date)} (${formatKm(toDelete.odometerKm)})? A próxima troca será recalculada.` : ''}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </Box>
  );
};

export default OleoTab;

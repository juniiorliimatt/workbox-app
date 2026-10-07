import { FC, useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormHelperText,
  Grid,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import dayjs, { Dayjs } from 'dayjs';
import * as yup from 'yup';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useSnackbar } from '@/hooks/useSnackbar';
import useLazyTabData from '@/hooks/useLazyTabData';
import { FuelType, IMotorcycle, IRefueling, IRefuelingRequest } from '@/interfaces/moto';
import { errorMessage } from '@/pages/moto/errors';
import { FUEL_TYPE_LABEL, formatDate, formatKm, formatLiters, formatPerLiter } from '@/pages/moto/format';
import { createRefueling, deleteRefueling, listRefuelings, updateRefueling } from '@/services/motoApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { formatCurrency } from '@/utils/format';

export interface AbastecimentosTabProps {
  motorcycle: IMotorcycle;
  /** Só a aba visível busca dados. */
  active: boolean;
  /** Avisa que um abastecimento mudou (o hodômetro atual, o consumo e a próxima troca dependem dele). */
  onChanged: () => void;
}

type PeriodMode = 'todos' | 'mensal' | 'anual';

const ISO = 'YYYY-MM-DD';
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** Intervalo `from`/`to` (inclusivo) da API para o filtro escolhido; `{}` = sem período. */
const periodRange = (mode: PeriodMode, year: number, month: number): { from?: string; to?: string } => {
  if (mode === 'mensal') {
    const start = dayjs(new Date(year, month - 1, 1));
    return { from: start.format(ISO), to: start.endOf('month').format(ISO) };
  }
  if (mode === 'anual') return { from: `${year}-01-01`, to: `${year}-12-31` };
  return {};
};

/** Campos numéricos ficam como texto no formulário (aceitam vírgula, sem setas do browser) e são convertidos no envio. */
interface FormValues {
  odometerKm: string;
  liters: string;
  totalValue: string;
  station: string;
  fuelType: FuelType;
  fullTank: boolean;
}

const EMPTY: FormValues = { odometerKm: '', liters: '', totalValue: '', station: '', fuelType: 'GASOLINA_COMUM', fullTank: false };

const DECIMAL = /^\d+([.,]\d{1,2})?$/;
const toNumber = (text: string): number => Number(text.trim().replace(',', '.'));

const decimalField = (required: string, invalid: string, notPositive: string) =>
  yup
    .string()
    .trim()
    .required(required)
    .matches(DECIMAL, invalid)
    .test('positivo', notPositive, (value) => !value || !DECIMAL.test(value) || toNumber(value) > 0);

const schema = yup.object().shape({
  odometerKm: yup
    .string()
    .trim()
    .required('Hodômetro é obrigatório')
    .matches(/^-?\d+$/, 'Informe um número inteiro')
    .test('nao-negativo', 'Hodômetro não pode ser negativo', (value) => !value || !value.startsWith('-')),
  liters: decimalField('Litros é obrigatório', 'Litros inválido', 'Litros deve ser maior que zero'),
  totalValue: decimalField('Valor é obrigatório', 'Valor inválido', 'Valor deve ser maior que zero'),
  station: yup.string().trim().max(120, 'Máximo de 120 caracteres').default(''),
  fuelType: yup.mixed<FuelType>().oneOf(Object.keys(FUEL_TYPE_LABEL) as FuelType[]).default('GASOLINA_COMUM'),
  fullTank: yup.boolean().default(false),
});

const toFormValues = (refueling: IRefueling): FormValues => ({
  odometerKm: refueling.odometerKm.toString(),
  liters: refueling.liters.toString(),
  totalValue: refueling.totalValue.toString(),
  station: refueling.station ?? '',
  fuelType: refueling.fuelType,
  fullTank: refueling.fullTank,
});

/** Preço por litro a partir do que está digitado; `null` enquanto algum dos dois não for um número válido. */
const livePricePerLiter = (liters: string, totalValue: string): number | null => {
  if (!DECIMAL.test(liters.trim()) || !DECIMAL.test(totalValue.trim())) return null;
  const l = toNumber(liters);
  return l > 0 ? toNumber(totalValue) / l : null;
};

/**
 * Abastecimentos da moto: lista paginada (mais recentes primeiro) com filtro de período, e formulário em diálogo.
 * O hodômetro é o **total** da moto; a API recusa um km que quebre a ordem cronológica e o motivo vai pro snackbar.
 */
const AbastecimentosTab: FC<AbastecimentosTabProps> = ({ motorcycle, active, onChanged }) => {
  const api = useAxiosWithAuth();
  const { showSnackbar } = useSnackbar();

  const [mode, setMode] = useState<PeriodMode>('todos');
  const [year, setYear] = useState(() => dayjs().year());
  const [month, setMonth] = useState(() => dayjs().month() + 1);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // Muda a chave de carga depois de gravar/excluir: o hook só recarrega quando a chave muda.
  const [version, setVersion] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IRefueling | null>(null);
  const [date, setDate] = useState<Dayjs | null>(() => dayjs());
  const [dateError, setDateError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<IRefueling | null>(null);

  const range = periodRange(mode, year, month);
  const key = [motorcycle.id, range.from ?? '', range.to ?? '', page, pageSize, version].join('|');
  const { data, error } = useLazyTabData(
    active,
    key,
    (signal) => listRefuelings(api, motorcycle.id, { ...range, page, size: pageSize }, signal),
    () => showSnackbar('Erro ao carregar abastecimentos', 'error'),
  );

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  const changeMode = (next: PeriodMode | null) => {
    if (!next) return;
    setMode(next);
    setPage(0);
  };

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: yupResolver(schema), defaultValues: EMPTY });

  const price = livePricePerLiter(watch('liters'), watch('totalValue'));

  const openNew = () => {
    setEditing(null);
    reset(EMPTY);
    setDate(dayjs());
    setDateError(null);
    setFormOpen(true);
  };

  const openEdit = (refueling: IRefueling) => {
    setEditing(refueling);
    reset(toFormValues(refueling));
    setDate(dayjs(refueling.date));
    setDateError(null);
    setFormOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    if (!date || !date.isValid()) {
      setDateError('Data é obrigatória');
      return;
    }
    const body: IRefuelingRequest = {
      date: date.format(ISO),
      odometerKm: Number(values.odometerKm),
      liters: toNumber(values.liters),
      totalValue: toNumber(values.totalValue),
      station: values.station.trim() || null,
      fuelType: values.fuelType,
      fullTank: values.fullTank,
    };
    try {
      if (editing) {
        await updateRefueling(api, motorcycle.id, editing.id, body);
        showSnackbar('Abastecimento atualizado!', 'success');
      } else {
        await createRefueling(api, motorcycle.id, body);
        showSnackbar('Abastecimento registrado!', 'success');
      }
      setFormOpen(false);
      reload();
      onChanged();
    } catch (e) {
      showSnackbar(errorMessage(e, 'Erro ao salvar abastecimento'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const refueling = toDelete;
    setToDelete(null);
    try {
      await deleteRefueling(api, motorcycle.id, refueling.id);
      showSnackbar('Abastecimento excluído!', 'success');
      reload();
      onChanged();
    } catch (e) {
      showSnackbar(errorMessage(e, 'Erro ao excluir abastecimento'), 'error');
    }
  };

  const yearOptions = Array.from({ length: 6 }, (_, i) => dayjs().year() - i);
  const items = data?.content ?? [];

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_event, next: PeriodMode | null) => changeMode(next)} aria-label="Período">
            <ToggleButton value="todos">Todos</ToggleButton>
            <ToggleButton value="mensal">Mensal</ToggleButton>
            <ToggleButton value="anual">Anual</ToggleButton>
          </ToggleButtonGroup>
          {mode === 'mensal' && (
            <TextField
              select
              size="small"
              label="Mês"
              value={month}
              onChange={(event) => {
                setMonth(Number(event.target.value));
                setPage(0);
              }}
              sx={{ minWidth: 140 }}
            >
              {MONTHS.map((name, index) => (
                <MenuItem key={name} value={index + 1}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
          )}
          {mode !== 'todos' && (
            <TextField
              select
              size="small"
              label="Ano"
              value={year}
              onChange={(event) => {
                setYear(Number(event.target.value));
                setPage(0);
              }}
              sx={{ minWidth: 100 }}
            >
              {yearOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Registrar abastecimento
        </Button>
      </Box>

      {error && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={reload}>Tentar novamente</Button>}>
          Não foi possível carregar os abastecimentos.
        </Alert>
      )}

      {!error && data === null && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Carregando abastecimentos" />
        </Box>
      )}

      {!error && data !== null && items.length === 0 && (
        <Typography color="text.secondary" sx={{ py: 3 }}>
          {mode === 'todos' ? 'Nenhum abastecimento registrado.' : 'Nenhum abastecimento neste período.'}
        </Typography>
      )}

      {!error && data !== null && items.length > 0 && (
        <>
          <TableContainer>
            <Table size="small" aria-label="Abastecimentos">
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell align="right">Hodômetro</TableCell>
                  <TableCell align="right">Litros</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>R$/L</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Combustível</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Posto</TableCell>
                  <TableCell>Tanque</TableCell>
                  <TableCell align="right">
                    <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Ações</span>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{formatDate(item.date)}</TableCell>
                    <TableCell align="right">{formatKm(item.odometerKm)}</TableCell>
                    <TableCell align="right">{formatLiters(item.liters)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.totalValue)}</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{formatPerLiter(item.pricePerLiter)}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{FUEL_TYPE_LABEL[item.fuelType]}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{item.station ?? '—'}</TableCell>
                    <TableCell>
                      {item.fullTank ? <Chip size="small" color="success" variant="outlined" label="Tanque cheio" /> : <Typography variant="body2" color="text.secondary">Parcial</Typography>}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <IconButton size="small" aria-label={`Editar abastecimento de ${formatDate(item.date)}`} onClick={() => openEdit(item)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" aria-label={`Excluir abastecimento de ${formatDate(item.date)}`} onClick={() => setToDelete(item)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data?.page.totalElements ?? 0}
            page={page}
            rowsPerPage={pageSize}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(_event, next) => setPage(next)}
            onRowsPerPageChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(0);
            }}
            labelRowsPerPage="Por página"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            getItemAriaLabel={(type) =>
              ({ first: 'Primeira página', previous: 'Página anterior', next: 'Próxima página', last: 'Última página' })[type]
            }
          />
        </>
      )}

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm" aria-labelledby="abastecimento-form-title">
        <DialogTitle id="abastecimento-form-title">{editing ? 'Editar abastecimento' : 'Registrar abastecimento'}</DialogTitle>
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
                  helperText={errors.odometerKm?.message ?? 'Hodômetro total da moto, não o trip'}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Litros"
                  required
                  fullWidth
                  inputProps={{ inputMode: 'decimal' }}
                  {...register('liters')}
                  error={Boolean(errors.liters)}
                  helperText={errors.liters?.message}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Valor total (R$)"
                  required
                  fullWidth
                  inputProps={{ inputMode: 'decimal' }}
                  {...register('totalValue')}
                  error={Boolean(errors.totalValue)}
                  helperText={errors.totalValue?.message}
                />
              </Grid>
              {price !== null && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" aria-live="polite">
                    Preço por litro: {formatPerLiter(price)}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="fuelType"
                  control={control}
                  render={({ field }) => (
                    <TextField select label="Combustível" fullWidth {...field}>
                      {(Object.keys(FUEL_TYPE_LABEL) as FuelType[]).map((type) => (
                        <MenuItem key={type} value={type}>
                          {FUEL_TYPE_LABEL[type]}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Posto" fullWidth {...register('station')} error={Boolean(errors.station)} helperText={errors.station?.message} />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="fullTank"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                      label="Completei o tanque"
                    />
                  )}
                />
                <FormHelperText sx={{ mt: -0.5, ml: 4 }}>Marcar melhora a precisão do km/l; é opcional.</FormHelperText>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="inherit" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Salvar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        title="Excluir abastecimento"
        message={toDelete ? `Excluir o abastecimento de ${formatDate(toDelete.date)} (${formatKm(toDelete.odometerKm)})? O consumo calculado será refeito.` : ''}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </Box>
  );
};

export default AbastecimentosTab;

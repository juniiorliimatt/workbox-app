import { FC, FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Autocomplete, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, IconButton, InputLabel, ListItemText, MenuItem, OutlinedInput, Select, Tab, Tabs,
  TextField, Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { useSnackbar } from '@/hooks/useSnackbar';
import { getErrorMessage } from '@/utils/errors';
import { MONTHS_OPTIONS } from './months';

export type BatchKind = 'revenue' | 'spending';

/** O que muda entre o lote de receitas e o de despesas: URLs, chave do payload, textos e as larguras dos campos. */
interface KindConfig {
  title: string;
  recurring: string;
  monthlyUrl: string;
  annualUrl: string;
  key: 'revenues' | 'spendings';
  monthlyOk: string;
  annualOk: string;
  referenceLabel: string;
  withDescription: boolean;
  gap: number;
  typeWidth: number;
  valueWidth: number;
}

const KINDS: Record<BatchKind, KindConfig> = {
  revenue: {
    title: 'Lançamento em Lote de Receitas',
    recurring: 'receitas',
    monthlyUrl: '/api/v1/revenues/batch',
    annualUrl: '/api/v1/revenues/batch/annual',
    key: 'revenues',
    monthlyOk: 'Receitas mensais em lote cadastradas com sucesso!',
    annualOk: 'Lote anual de receitas cadastrado com sucesso!',
    referenceLabel: 'Comp. (Opc)',
    withDescription: false,
    gap: 2,
    typeWidth: 220,
    valueWidth: 140,
  },
  spending: {
    title: 'Lançamento em Lote de Despesas',
    recurring: 'despesas',
    monthlyUrl: '/api/v1/spendings/batch',
    annualUrl: '/api/v1/spendings/batch/annual',
    key: 'spendings',
    monthlyOk: 'Despesas mensais em lote cadastradas com sucesso!',
    annualOk: 'Lote anual de despesas cadastrado com sucesso!',
    referenceLabel: 'Comp.',
    withDescription: true,
    gap: 1,
    typeWidth: 180,
    valueWidth: 110,
  },
};

interface BatchItem {
  date: Dayjs | null;
  referenceDate: Dayjs | null;
  typeId: string;
  description: string;
  value: string;
  wasPaid: boolean;
}

const emptyItem = (): BatchItem => ({ date: dayjs(), referenceDate: null, typeId: '', description: '', value: '', wasPaid: false });

/** Lista de linhas editáveis (adicionar copia a data da última; remover trava na última linha). */
const useBatchLines = () => {
  const [items, setItems] = useState<BatchItem[]>([emptyItem()]);
  const reset = useCallback(() => setItems([emptyItem()]), []);
  const change = (index: number, field: keyof BatchItem, value: unknown) =>
    setItems((previous) => previous.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  const add = () =>
    setItems((previous) => {
      const last = previous.length > 0 ? previous[previous.length - 1] : null;
      return [...previous, { ...emptyItem(), date: last ? last.date : dayjs(), referenceDate: last ? last.referenceDate : null }];
    });
  const remove = (index: number) => setItems((previous) => previous.filter((_, i) => i !== index));
  return { items, reset, change, add, remove };
};

type BatchLines = ReturnType<typeof useBatchLines>;
interface TypeOption { id: string; name: string }

interface LinesProps {
  kind: KindConfig;
  lines: BatchLines;
  types: TypeOption[];
  dateLabel: string;
  descriptionLabel: string;
  addLabel: string;
  /** A visão anual só usa a data base; a mensal também pede a competência. */
  withReference: boolean;
}

/** As linhas do lote (mensal ou anual) — mesmos campos, só os rótulos e a competência mudam. */
const BatchLinesEditor: FC<LinesProps> = ({ kind, lines, types, dateLabel, descriptionLabel, addLabel, withReference }) => (
  <>
    {lines.items.map((item, index) => (
      <Box key={index} sx={{ display: 'flex', gap: kind.gap, alignItems: 'center', mb: 2 }}>
        <DatePicker sx={{ minWidth: 150 }} label={dateLabel} value={item.date} onChange={(val) => lines.change(index, 'date', val)} format="DD/MM/YYYY" slotProps={{ textField: { required: true, size: 'small', sx: { width: 180 } } }} />
        {withReference && (
          <DatePicker label={kind.referenceLabel} value={item.referenceDate} onChange={(val) => lines.change(index, 'referenceDate', val)} format="MM/YYYY" views={['year', 'month']} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
        )}
        <Autocomplete
          options={types}
          getOptionLabel={(option) => option.name}
          value={types.find((t) => t.id === item.typeId) || null}
          onChange={(_, newValue) => lines.change(index, 'typeId', newValue ? newValue.id : '')}
          renderInput={(params) => <TextField {...params} label="Tipo" required size="small" />}
          sx={{ width: kind.typeWidth }}
        />
        {kind.withDescription && (
          <TextField label={descriptionLabel} value={item.description} onChange={(e) => lines.change(index, 'description', e.target.value)} required size="small" sx={{ flexGrow: 1 }} />
        )}
        <TextField type="number" label="Valor" value={item.value} onChange={(e) => lines.change(index, 'value', e.target.value)} required size="small" inputProps={{ step: '0.01' }} sx={{ width: kind.valueWidth }} />
        {kind.withDescription && (
          <FormControlLabel control={<Checkbox checked={item.wasPaid} onChange={(e) => lines.change(index, 'wasPaid', e.target.checked)} size="small" />} label="Pago" sx={{ ml: 1, mr: 0 }} />
        )}
        <IconButton color="error" onClick={() => lines.remove(index)} disabled={lines.items.length === 1}><DeleteIcon /></IconButton>
      </Box>
    ))}
    <Button variant="text" startIcon={<AddIcon />} onClick={lines.add}>{addLabel}</Button>
  </>
);

interface Props {
  open: boolean;
  onClose: () => void;
  kind: BatchKind;
  types: TypeOption[];
  onSaved: () => void;
}

const formatDate = (date: Dayjs | null) => (date ? date.format('YYYY-MM-DD') : null);

/** Lançamento em lote: aba mensal (várias linhas, cada uma com sua data) e aba anual (recorrente nos meses escolhidos). */
const BatchLaunchModal: FC<Props> = ({ open, onClose, kind: kindName, types, onSaved }) => {
  const kind = KINDS[kindName];
  const api = useAxiosWithAuth();
  const { showSnackbar } = useSnackbar();
  const [tabIndex, setTabIndex] = useState(0);
  const monthlyLines = useBatchLines();
  const annualLines = useBatchLines();
  const [annualMonths, setAnnualMonths] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const { reset: resetMonthly } = monthlyLines;
  const { reset: resetAnnual } = annualLines;

  useEffect(() => {
    if (open) {
      setTabIndex(0);
      resetMonthly();
      resetAnnual();
      setAnnualMonths([]);
    }
  }, [open, resetMonthly, resetAnnual]);

  const submit = (url: string, payload: unknown, okMessage: string, errorPrefix: string) => async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(url, payload);
      showSnackbar(okMessage, 'success');
      onClose();
      onSaved();
    } catch (err: unknown) {
      showSnackbar(`${errorPrefix}: ${getErrorMessage(err)}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Cada API aceita só as chaves do seu tipo: a receita não leva descrição/situação.
  const monthlyPayload = () => ({
    [kind.key]: monthlyLines.items.map((item) => ({
      date: formatDate(item.date),
      referenceDate: formatDate(item.referenceDate),
      typeId: item.typeId,
      ...(kind.withDescription && { description: item.description }),
      value: Number(item.value),
      ...(kind.withDescription && { wasPaid: item.wasPaid }),
    })),
  });

  const annualPayload = () => ({
    [kind.key]: annualLines.items.map((item) => ({
      date: formatDate(item.date),
      typeId: item.typeId,
      ...(kind.withDescription && { description: item.description }),
      value: Number(item.value),
      ...(kind.withDescription && { wasPaid: item.wasPaid }),
    })),
    months: annualMonths.length > 0 ? annualMonths : undefined,
  });

  const monthsLabel = 'Meses de Destino (Vazio = Todos os 12)';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ textAlign: 'center' }}>{kind.title}</DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tabIndex} onChange={(_, val: number) => setTabIndex(val)} centered>
          <Tab label="Lote Mensal (Linhas)" />
          <Tab label="Lote Anual (Recorrente)" />
        </Tabs>
      </Box>

      {tabIndex === 0 && (
        <form onSubmit={(e) => submit(kind.monthlyUrl, monthlyPayload(), kind.monthlyOk, 'Erro ao salvar lote')(e)}>
          <DialogContent dividers>
            <BatchLinesEditor kind={kind} lines={monthlyLines} types={types} dateLabel="Data" descriptionLabel="Descrição" addLabel="Adicionar linha" withReference />
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? <CircularProgress size={24} /> : 'Salvar Mensal'}
            </Button>
          </DialogActions>
        </form>
      )}

      {tabIndex === 1 && (
        <form onSubmit={(e) => submit(kind.annualUrl, annualPayload(), kind.annualOk, 'Erro ao salvar lote anual')(e)}>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Cria {kind.recurring} recorrentes para os meses selecionados (ou todos). O <strong>Dia</strong> e <strong>Ano</strong> base vêm da data de cada linha.
                </Typography>

                <FormControl size="small" sx={{ width: 350 }}>
                  <InputLabel>{monthsLabel}</InputLabel>
                  <Select
                    multiple
                    value={annualMonths}
                    onChange={(e) => setAnnualMonths(typeof e.target.value === 'string' ? e.target.value.split(',').map(Number) : (e.target.value as number[]))}
                    input={<OutlinedInput label={monthsLabel} />}
                    renderValue={(selected) => selected.map((v) => MONTHS_OPTIONS.find((m) => m.value === v)?.label).join(', ')}
                  >
                    {MONTHS_OPTIONS.map((month) => (
                      <MenuItem key={month.value} value={month.value}>
                        <Checkbox checked={annualMonths.indexOf(month.value) > -1} />
                        <ListItemText primary={month.label} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <BatchLinesEditor kind={kind} lines={annualLines} types={types} dateLabel="Data Base" descriptionLabel="Descrição Base" addLabel="Adicionar linha anual" withReference={false} />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" color="secondary" disabled={saving}>
              {saving ? <CircularProgress size={24} /> : 'Salvar Anual'}
            </Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
};

export default BatchLaunchModal;

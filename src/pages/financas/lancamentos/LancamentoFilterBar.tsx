import { FC } from 'react';
import { Button, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { MONTH_NUMBERS } from './months';

interface Props {
  title: string;
  types: { id: string; name: string }[];
  type: string;
  onType: (value: string) => void;
  month: number;
  onMonth: (value: number) => void;
  year: number;
  onYear: (value: number) => void;
  /** Visão anual: o mês "Todos" (0) existe; na mensal o mês é sempre um dos 12. */
  allowAllMonths?: boolean;
  onApply: () => void;
}

/** Barra de filtro (tipo, mês, ano) das abas Mensal e Anual — a mesma pra receitas e despesas. */
const LancamentoFilterBar: FC<Props> = ({ title, types, type, onType, month, onMonth, year, onYear, allowAllMonths = false, onApply }) => (
  <Paper elevation={1} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'flex-end' }}>
    <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
    <TextField select label="Tipo" value={type} onChange={(e) => onType(e.target.value)} size="small" sx={{ minWidth: 150 }}>
      <MenuItem value="">Todos</MenuItem>
      {types.map((t) => (
        <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
      ))}
    </TextField>
    <TextField select label="Mês" value={month} onChange={(e) => onMonth(Number(e.target.value))} size="small">
      {allowAllMonths && <MenuItem value={0}>Todos</MenuItem>}
      {MONTH_NUMBERS.map((m) => (
        <MenuItem key={m} value={m}>{m.toString().padStart(2, '0')}</MenuItem>
      ))}
    </TextField>
    <TextField type="number" label="Ano" value={year} onChange={(e) => onYear(Number(e.target.value))} size="small" sx={{ width: 100 }} />
    <Button variant="contained" onClick={onApply}>Filtrar</Button>
  </Paper>
);

export default LancamentoFilterBar;

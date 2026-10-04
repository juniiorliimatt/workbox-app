import { FC } from 'react';
import { Checkbox, Chip, FormControlLabel, MenuItem, TableCell, TextField } from '@mui/material';
import dayjs from 'dayjs';
import { SpendingDTO, SpendingTypeDTO } from '@/interfaces/budget';
import { formatCurrency } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import LancamentosPage, { LancamentoColumn } from './lancamentos/LancamentosPage';
import { basePayload, LancamentoConfig, useLancamentos } from './lancamentos/useLancamentos';

/** Categoria da regra 50/30/20 do "Novo Tipo de Despesa". */
interface TypeExtras {
  category: string;
}

const CONFIG: LancamentoConfig<SpendingDTO, TypeExtras> = {
  listUrl: '/api/v1/spendings',
  typesUrl: '/api/v1/spending-types',
  toForm: (spending) => ({
    date: dayjs(spending.date),
    refDate: spending.referenceDate ? dayjs(spending.referenceDate) : null,
    value: spending.value.toString(),
    typeId: spending.typeId,
    description: spending.description || '',
    wasPaid: spending.wasPaid,
  }),
  toPayload: (form) => ({ ...basePayload(form), description: form.description, wasPaid: form.wasPaid }),
  typeExtrasDefault: { category: 'ESSENTIAL' },
  toTypePayload: (name, extras) => ({ name, category: extras.category }),
  messages: {
    created: 'Despesa salva com sucesso!',
    updated: 'Despesa atualizada com sucesso!',
    saveError: (detail) => `Erro ao salvar despesa: ${detail}`,
    deleted: 'Despesa excluída com sucesso!',
    deleteError: (error) => `Erro ao excluir despesa: ${getErrorMessage(error) || 'Desconhecido'}`,
    typeCreated: 'Tipo salvo com sucesso!',
  },
};

const COLUMNS: LancamentoColumn[] = [
  { sortKey: 'date', label: 'Data' },
  { sortKey: 'referenceDate', label: 'Competência' },
  { label: 'Descrição' },
  { sortKey: 'type.name', label: 'Tipo' },
  { sortKey: 'wasPaid', label: 'Situação' },
  { sortKey: 'value', label: 'Valor (R$)' },
];

const Despesas: FC = () => {
  const l = useLancamentos<SpendingDTO, SpendingTypeDTO, TypeExtras>(CONFIG);

  return (
    <LancamentosPage
      l={l}
      title="Despesas"
      batchKind="spending"
      newButtonLabel="Nova Despesa"
      formTitles={{ create: 'Nova Despesa', edit: 'Editar Despesa' }}
      dateLabel="Data do Movimento"
      deleteTitle="Excluir Despesa"
      emptyText="Nenhuma despesa encontrada."
      typeDialogTitle="Novo Tipo de Despesa"
      columns={COLUMNS}
      renderCells={(spending) => (
        <>
          <TableCell>{dayjs(spending.date).format('DD/MM/YYYY')}</TableCell>
          <TableCell>{spending.referenceDate ? dayjs(spending.referenceDate).format('MM/YYYY') : '-'}</TableCell>
          <TableCell>{spending.description || '-'}</TableCell>
          <TableCell>{spending.typeName}</TableCell>
          <TableCell>
            <Chip
              label={spending.wasPaid ? 'Pago' : 'Pendente'}
              size="small"
              sx={{ fontWeight: 500, bgcolor: spending.wasPaid ? '#e8f5e9' : '#fff3e0', color: spending.wasPaid ? '#2e7d32' : '#ed6c02' }}
            />
          </TableCell>
          <TableCell>{formatCurrency(spending.value)}</TableCell>
        </>
      )}
      formAfterDates={
        <TextField fullWidth label="Descrição" size="small" value={l.form.description} onChange={(e) => l.patchForm({ description: e.target.value })} margin="dense" />
      }
      formValueSide={
        <FormControlLabel
          control={<Checkbox checked={l.form.wasPaid} onChange={(e) => l.patchForm({ wasPaid: e.target.checked })} />}
          label="Já foi pago"
          sx={{ whiteSpace: 'nowrap' }}
        />
      }
      typeDialogFields={
        <TextField
          fullWidth
          select
          label="Categoria da Regra 50/30/20"
          value={l.typeExtras.category}
          onChange={(e) => l.setTypeExtras({ category: e.target.value })}
          required
          margin="dense"
        >
          <MenuItem value="ESSENTIAL">Gastos Essenciais (50%)</MenuItem>
          <MenuItem value="PERSONAL">Gastos Pessoais (30%)</MenuItem>
          <MenuItem value="SAVINGS">Economia/Investimento (20%)</MenuItem>
        </TextField>
      }
    />
  );
};

export default Despesas;

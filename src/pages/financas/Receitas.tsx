import { FC } from 'react';
import { Checkbox, FormControlLabel, TableCell } from '@mui/material';
import dayjs from 'dayjs';
import { RevenueDTO, RevenueTypeDTO } from '@/interfaces/budget';
import { formatCurrency } from '@/utils/format';
import LancamentosPage, { LancamentoColumn } from './lancamentos/LancamentosPage';
import { basePayload, LancamentoConfig, useLancamentos } from './lancamentos/useLancamentos';

/** Flags do "Novo Tipo de Receita". A API de tipos de receita hoje só recebe o nome (as flags ainda não são enviadas). */
interface TypeExtras {
  includeInTotals: boolean;
  includeInMonthlyTotals: boolean;
}

const CONFIG: LancamentoConfig<RevenueDTO, TypeExtras> = {
  listUrl: '/api/v1/revenues',
  typesUrl: '/api/v1/revenue-types',
  toForm: (revenue) => ({
    date: dayjs(revenue.date),
    refDate: revenue.referenceDate ? dayjs(revenue.referenceDate) : null,
    value: revenue.value.toString(),
    typeId: revenue.typeId,
    description: '',
    wasPaid: false,
  }),
  toPayload: basePayload,
  typeExtrasDefault: { includeInTotals: true, includeInMonthlyTotals: true },
  toTypePayload: (name) => ({ name }),
  messages: {
    created: 'Receita criada com sucesso!',
    updated: 'Receita atualizada com sucesso!',
    saveError: (detail) => `Erro: ${detail}`,
    deleted: 'Receita excluída com sucesso!',
    deleteError: () => 'Erro ao excluir receita',
    typeCreated: 'Tipo criado com sucesso!',
  },
};

const COLUMNS: LancamentoColumn[] = [
  { sortKey: 'date', label: 'Data' },
  { sortKey: 'referenceDate', label: 'Competência' },
  { sortKey: 'type.name', label: 'Tipo' },
  { sortKey: 'value', label: 'Valor (R$)' },
];

const Receitas: FC = () => {
  const l = useLancamentos<RevenueDTO, RevenueTypeDTO, TypeExtras>(CONFIG);

  return (
    <LancamentosPage
      l={l}
      title="Receitas"
      batchKind="revenue"
      newButtonLabel="Nova Receita"
      formTitles={{ create: 'Nova Receita', edit: 'Editar Receita' }}
      dateLabel="Data do Lançamento"
      deleteTitle="Excluir Receita"
      emptyText="Nenhuma receita encontrada."
      typeDialogTitle="Novo Tipo de Receita"
      columns={COLUMNS}
      renderCells={(revenue) => (
        <>
          <TableCell>{dayjs(revenue.date).format('DD/MM/YYYY')}</TableCell>
          <TableCell>{revenue.referenceDate ? dayjs(revenue.referenceDate).format('MM/YYYY') : '-'}</TableCell>
          <TableCell>{revenue.typeName}</TableCell>
          <TableCell>{formatCurrency(revenue.value)}</TableCell>
        </>
      )}
      typeDialogFields={
        <>
          <FormControlLabel
            control={<Checkbox checked={l.typeExtras.includeInTotals} onChange={(e) => l.setTypeExtras((previous) => ({ ...previous, includeInTotals: e.target.checked }))} />}
            label="Incluir na contagem anual"
            sx={{ mt: 1 }}
          />
          <FormControlLabel
            control={<Checkbox checked={l.typeExtras.includeInMonthlyTotals} onChange={(e) => l.setTypeExtras((previous) => ({ ...previous, includeInMonthlyTotals: e.target.checked }))} />}
            label="Incluir na contagem mensal"
            sx={{ mt: 1 }}
          />
        </>
      }
    />
  );
};

export default Receitas;

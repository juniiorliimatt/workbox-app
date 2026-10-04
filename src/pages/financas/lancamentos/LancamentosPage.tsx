import { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Autocomplete, Box, Button, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, Tabs, TextField,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, History as HistoryIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import AppNavbar from '@/components/AppNavbar';
import ConfirmDialog from '@/components/ConfirmDialog';
import AuditHistoryDialog from './AuditHistoryDialog';
import BatchLaunchModal, { BatchKind } from './BatchLaunchModal';
import LancamentoFilterBar from './LancamentoFilterBar';
import NewTypeDialog from './NewTypeDialog';
import { Lancamentos } from './useLancamentos';

export interface LancamentoColumn {
  /** Campo de ordenação enviado à API (`sort=<key>,asc|desc`); sem ele a coluna não ordena. */
  sortKey?: string;
  label: string;
}

interface Props<TItem extends { id: string }, TType extends { id: string; name: string }, TExtras> {
  l: Lancamentos<TItem, TType, TExtras>;
  title: string;
  batchKind: BatchKind;
  newButtonLabel: string;
  formTitles: { create: string; edit: string };
  dateLabel: string;
  deleteTitle: string;
  emptyText: string;
  typeDialogTitle: string;
  columns: LancamentoColumn[];
  /** Células da linha, na ordem de `columns` (a coluna de ações é do layout). */
  renderCells: (item: TItem) => ReactNode;
  /** Campo extra logo abaixo das datas no formulário (a descrição da despesa). */
  formAfterDates?: ReactNode;
  /** Controle ao lado do valor no formulário (o "Já foi pago" da despesa). */
  formValueSide?: ReactNode;
  /** Campos próprios do tipo no diálogo "Novo Tipo" (categoria da despesa, flags da receita). */
  typeDialogFields?: ReactNode;
}

/**
 * Layout das telas de lançamentos (Receitas e Despesas): barra de ações, abas Mensal/Anual com filtro, tabela ordenável
 * e paginada, formulário, exclusão, histórico, lote e "novo tipo". Cada tela só entrega os textos, as colunas e os
 * campos que lhe são próprios.
 */
const LancamentosPage = <TItem extends { id: string }, TType extends { id: string; name: string }, TExtras>({
  l, title, batchKind, newButtonLabel, formTitles, dateLabel, deleteTitle, emptyText, typeDialogTitle,
  columns, renderCells, formAfterDates, formValueSide, typeDialogFields,
}: Props<TItem, TType, TExtras>) => {
  const colSpan = columns.length + 1;

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar title={title} showBackButton backPath="/financas" backLabel="Voltar" />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="outlined" sx={{ mr: 2 }} onClick={() => l.setBatchOpen(true)}>Lançamento em Lote</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={l.openNew}>{newButtonLabel}</Button>
          <Button variant="outlined" component={RouterLink} to="/financas/orcamentos" sx={{ ml: 2 }}>Metas e Orçamentos</Button>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={l.tabValue} onChange={l.handleTabChange} variant="fullWidth" centered>
            <Tab label="Visão Mensal" />
            <Tab label="Visão Anual" />
          </Tabs>
        </Box>

        {l.tabValue === 0 && (
          <LancamentoFilterBar
            title="Filtro Mensal:"
            types={l.types}
            type={l.monthly.type}
            onType={(type) => l.setMonthly((previous) => ({ ...previous, type }))}
            month={l.monthly.month}
            onMonth={(month) => l.setMonthly((previous) => ({ ...previous, month }))}
            year={l.monthly.year}
            onYear={(year) => l.setMonthly((previous) => ({ ...previous, year }))}
            onApply={() => l.applyFilter(l.monthly)}
          />
        )}

        {l.tabValue === 1 && (
          <LancamentoFilterBar
            title="Filtro Anual:"
            types={l.types}
            type={l.annual.type}
            onType={(type) => l.setAnnual((previous) => ({ ...previous, type }))}
            month={l.annual.month}
            onMonth={(month) => l.setAnnual((previous) => ({ ...previous, month }))}
            year={l.annual.year}
            onYear={(year) => l.setAnnual((previous) => ({ ...previous, year }))}
            allowAllMonths
            onApply={() => l.applyFilter(l.annual)}
          />
        )}

        <TableContainer component={Paper}>
          <Table size="small" sx={{ '& .MuiTableCell-root': { fontSize: '0.95rem', py: 1 } }}>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.label}>
                    {column.sortKey ? (
                      <TableSortLabel
                        active={l.orderBy === column.sortKey}
                        direction={l.orderBy === column.sortKey ? l.orderDirection : 'asc'}
                        onClick={() => l.handleRequestSort(column.sortKey as string)}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                ))}
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {l.loading ? (
                <TableRow><TableCell colSpan={colSpan} align="center"><CircularProgress /></TableCell></TableRow>
              ) : l.items.length === 0 ? (
                <TableRow><TableCell colSpan={colSpan} align="center">{emptyText}</TableCell></TableRow>
              ) : (
                l.items.map((item) => (
                  <TableRow key={item.id}>
                    {renderCells(item)}
                    <TableCell align="center">
                      <IconButton color="info" onClick={() => void l.openAudit(item)} title="Ver Histórico"><HistoryIcon /></IconButton>
                      <IconButton color="primary" onClick={() => l.openEdit(item)}><EditIcon /></IconButton>
                      <IconButton color="error" onClick={() => l.setDeleteTargetId(item.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[12, 24, 36]}
          component="div"
          count={l.totalElements}
          rowsPerPage={l.rowsPerPage}
          page={l.page}
          onPageChange={(_event, newPage) => l.setPage(newPage)}
          onRowsPerPageChange={l.handleChangeRowsPerPage}
          labelRowsPerPage="Itens por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
        />

        <Dialog open={l.formOpen} onClose={() => l.setFormOpen(false)} PaperProps={{ sx: { width: '750px', maxWidth: '90vw' } }}>
          <form onSubmit={(e) => void l.save(e)}>
            <DialogTitle>{l.editingId ? formTitles.edit : formTitles.create}</DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker label={dateLabel} value={l.form.date} onChange={(date) => l.patchForm({ date })} format="DD/MM/YYYY" slotProps={{ textField: { fullWidth: true, margin: 'normal', required: true, size: 'small' } }} />
                <DatePicker label="Competência (Opcional)" value={l.form.refDate} onChange={(refDate) => l.patchForm({ refDate })} format="MM/YYYY" views={['year', 'month']} slotProps={{ textField: { fullWidth: true, margin: 'normal', size: 'small' } }} />
              </Box>
              {formAfterDates}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2, mb: 1 }}>
                <Autocomplete
                  options={l.types}
                  getOptionLabel={(option) => option.name}
                  value={l.types.find((t) => t.id === l.form.typeId) || null}
                  onChange={(_, newValue) => l.patchForm({ typeId: newValue ? newValue.id : '' })}
                  renderInput={(params) => <TextField {...params} label="Tipo" required margin="none" size="small" />}
                  sx={{ flexGrow: 1 }}
                />
                <IconButton color="primary" onClick={() => l.setTypeModalOpen(true)} sx={{ bgcolor: 'action.hover', borderRadius: 1 }} title="Adicionar novo tipo">
                  <AddIcon />
                </IconButton>
              </Box>
              {formValueSide ? (
                <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center' }}>
                  <TextField fullWidth type="number" label="Valor" size="small" value={l.form.value} onChange={(e) => l.patchForm({ value: e.target.value })} required margin="none" inputProps={{ step: '0.01' }} />
                  {formValueSide}
                </Box>
              ) : (
                <TextField fullWidth type="number" label="Valor" size="small" value={l.form.value} onChange={(e) => l.patchForm({ value: e.target.value })} required margin="dense" inputProps={{ step: '0.01' }} />
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => l.setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="contained">Salvar</Button>
            </DialogActions>
          </form>
        </Dialog>

        <NewTypeDialog
          title={typeDialogTitle}
          open={l.typeModalOpen}
          onClose={() => l.setTypeModalOpen(false)}
          name={l.newTypeName}
          onName={l.setNewTypeName}
          loading={l.typeLoading}
          onSubmit={(e) => void l.saveType(e)}
        >
          {typeDialogFields}
        </NewTypeDialog>
      </Container>

      <AuditHistoryDialog target={l.auditTarget} loading={l.isLoadingAudit} history={l.auditHistory} onClose={() => l.setAuditTarget(null)} />

      <BatchLaunchModal open={l.batchOpen} onClose={() => l.setBatchOpen(false)} kind={batchKind} types={l.types} onSaved={() => void l.reload()} />

      <ConfirmDialog
        open={l.deleteTargetId !== null}
        title={deleteTitle}
        message="Tem certeza que deseja excluir este lançamento financeiro? Esta ação não pode ser desfeita."
        onCancel={() => l.setDeleteTargetId(null)}
        onConfirm={() => void l.confirmDelete()}
      />
    </Box>
  );
};

export default LancamentosPage;

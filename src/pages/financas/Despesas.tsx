import { FC, useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Chip, Typography,
  FormControlLabel, Checkbox, TablePagination, TableSortLabel
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, History as HistoryIcon } from '@mui/icons-material';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import AppNavbar from '@/components/AppNavbar';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SpendingDTO, SpendingTypeDTO , SpendingRevisionDTO } from '@/interfaces/budget';
import dayjs, { Dayjs } from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const Despesas: FC = () => {
  const api = useAxiosWithAuth();
  const { showSnackbar } = useSnackbar();
  
  const [spendings, setSpendings] = useState<SpendingDTO[]>([]);
  const [types, setTypes] = useState<SpendingTypeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [auditTarget, setAuditTarget] = useState<SpendingDTO | null>(null);
  const [auditHistory, setAuditHistory] = useState<SpendingRevisionDTO[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [totalElements, setTotalElements] = useState(0);
  const [orderBy, setOrderBy] = useState('date');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');

  
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formDate, setFormDate] = useState<Dayjs | null>(null);
  const [formRefDate, setFormRefDate] = useState<Dayjs | null>(null);
  const [formDesc, setFormDesc] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formTypeId, setFormTypeId] = useState('');

  const [openBatchModal, setOpenBatchModal] = useState(false);
  const [batchItems, setBatchItems] = useState<any[]>([{ date: dayjs(), referenceDate: null, typeId: '', description: '', value: '', wasPaid: false }]);
  const [batchLoading, setBatchLoading] = useState(false);

  const [formWasPaid, setFormWasPaid] = useState(false);

  const [openTypeModal, setOpenTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCategory, setNewTypeCategory] = useState('ESSENTIAL');
  const [typeLoading, setTypeLoading] = useState(false);

  const [confirmTarget, setConfirmTarget] = useState<{ type: 'spending' | 'type', id: string } | null>(null);

  
  const handleOpenAudit = async (item: SpendingDTO) => {
    setAuditTarget(item);
    setIsLoadingAudit(true);
    setAuditHistory([]);
    try {
      const res = await api.get(`/api/v1/spendings/${item.id}/history`);
      setAuditHistory(res.data || []);
    } catch (e: any) {
      console.error(e);
      showSnackbar('Erro ao carregar histórico de auditoria', 'error');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const getRevisionTypeChip = (type: string) => {
    switch (type) {
      case 'ADD': return <Chip label="Criação (ADD)" color="success" size="small" />;
      case 'MOD': return <Chip label="Alteração (MOD)" color="primary" size="small" />;
      case 'DEL': return <Chip label="Exclusão (DEL)" color="error" size="small" />;
      default: return <Chip label={type} size="small" />;
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [spendRes, typeRes] = await Promise.all([
        api.get('/api/v1/spendings', { params: { page, size: rowsPerPage, sort: `${orderBy},${orderDirection}` } }),
        api.get('/api/v1/spending-types')
      ]);
      setSpendings(Array.isArray(spendRes.data?.content) ? spendRes.data.content : []);
      setTotalElements(spendRes.data?.totalElements || 0);
      setTypes(Array.isArray(typeRes.data) ? typeRes.data : []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api, page, rowsPerPage, orderBy, orderDirection]);

  
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && orderDirection === 'asc';
    setOrderDirection(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenNew = () => {
    setEditingId(null);
    setFormDate(dayjs());
    setFormRefDate(null);
    setFormDesc('');
    setFormValue('');
    setFormTypeId('');
    setFormWasPaid(false);
    setOpen(true);
  };

  const handleEdit = (s: SpendingDTO) => {
    setEditingId(s.id);
    setFormDate(dayjs(s.date));
    setFormRefDate(s.referenceDate ? dayjs(s.referenceDate) : null);
    setFormDesc(s.description || '');
    setFormValue(s.value.toString());
    setFormTypeId(s.typeId);
    setFormWasPaid(s.wasPaid);
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        date: formDate?.format('YYYY-MM-DD') || '',
        referenceDate: formRefDate ? formRefDate.format('YYYY-MM-DD') : null,
        description: formDesc,
        value: Number(formValue),
        typeId: formTypeId,
        wasPaid: formWasPaid
      };
      
      if (editingId) {
        await api.put(`/api/v1/spendings/${editingId}`, payload);
        showSnackbar('Despesa atualizada com sucesso!', 'success');
      } else {
        await api.post('/api/v1/spendings', payload);
        showSnackbar('Despesa salva com sucesso!', 'success');
      }
      
      setOpen(false);
      loadData();
    } catch (e: any) {
      console.error(e);
      showSnackbar(`Erro ao salvar despesa: ${e?.response?.data?.message || e?.message || 'Desconhecido'}`, 'error');
    }
  };

  const executeDelete = async (id: string) => {
    try {
      await api.delete(`/api/v1/spendings/${id}`);
      loadData();
      showSnackbar('Despesa excluída com sucesso!', 'success');
    } catch (e: any) {
      console.error(e);
      showSnackbar(`Erro ao excluir despesa: ${e?.response?.data?.message || 'Desconhecido'}`, 'error');
    } finally {
      setConfirmTarget(null);
    }
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setTypeLoading(true);
    try {
      const res = await api.post<SpendingTypeDTO>('/api/v1/spending-types', { name: newTypeName, category: newTypeCategory });
      setTypes(prev => [...prev, res.data]);
      setFormTypeId(res.data.id);
      setOpenTypeModal(false);
      setNewTypeName('');
      setNewTypeCategory('ESSENTIAL');
      showSnackbar('Tipo salvo com sucesso!', 'success');
    } catch (e: any) {
      console.error(e);
      showSnackbar(`Erro: ${e?.response?.data?.message || e?.message || 'Desconhecido'}`, 'error');
    } finally {
      setTypeLoading(false);
    }
  };

  
  const handleAddBatchLine = () => {
    setBatchItems([...batchItems, { date: dayjs(), referenceDate: null, typeId: '', description: '', value: '', wasPaid: false }]);
  };

  const handleRemoveBatchLine = (index: number) => {
    setBatchItems(batchItems.filter((_, i) => i !== index));
  };

  const handleBatchChange = (index: number, field: string, val: any) => {
    const newItems = [...batchItems];
    newItems[index][field] = val;
    setBatchItems(newItems);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchLoading(true);
    try {
      const payload = batchItems.map(item => ({
        date: item.date ? item.date.format('YYYY-MM-DD') : null,
        referenceDate: item.referenceDate ? item.referenceDate.format('YYYY-MM-DD') : null,
        typeId: item.typeId,
        description: item.description,
        value: Number(item.value),
        wasPaid: item.wasPaid
      }));
      await api.post('/api/v1/spendings/batch', payload);
      showSnackbar('Despesas em lote cadastradas com sucesso!', 'success');
      setOpenBatchModal(false);
      setBatchItems([{ date: dayjs(), referenceDate: null, typeId: '', description: '', value: '', wasPaid: false }]);
      loadData();
    } catch (e: any) {
      console.error(e);
      showSnackbar(`Erro ao salvar lote: ${e?.response?.data?.message || e?.message}`, 'error');
    } finally {
      setBatchLoading(false);
    }
  };

  const executeDeleteType = async (id: string) => {
    try {
      await api.delete(`/api/v1/spending-types/${id}`);
      setTypes(prev => prev.filter(t => t.id !== id));
      setFormTypeId('');
      showSnackbar('Tipo excluído com sucesso!', 'success');
    } catch (e: any) {
      console.error(e);
      showSnackbar(`Erro ao excluir tipo: ${e?.response?.data?.message || 'Em uso por despesas existentes'}`, 'error');
    } finally {
      setConfirmTarget(null);
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar title="Despesas" showBackButton backPath="/financas" backLabel="Voltar" />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="outlined" sx={{ mr: 2 }} onClick={() => setOpenBatchModal(true)}>Lançamento em Lote</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNew}>Nova Despesa</Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              
            <TableRow>
              <TableCell>
                <TableSortLabel active={orderBy === 'date'} direction={orderBy === 'date' ? orderDirection : 'asc'} onClick={() => handleRequestSort('date')}>Data</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={orderBy === 'referenceDate'} direction={orderBy === 'referenceDate' ? orderDirection : 'asc'} onClick={() => handleRequestSort('referenceDate')}>Competência</TableSortLabel>
              </TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>
                <TableSortLabel active={orderBy === 'type.name'} direction={orderBy === 'type.name' ? orderDirection : 'asc'} onClick={() => handleRequestSort('type.name')}>Tipo</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={orderBy === 'wasPaid'} direction={orderBy === 'wasPaid' ? orderDirection : 'asc'} onClick={() => handleRequestSort('wasPaid')}>Situação</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={orderBy === 'value'} direction={orderBy === 'value' ? orderDirection : 'asc'} onClick={() => handleRequestSort('value')}>Valor (R$)</TableSortLabel>
              </TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>

            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center"><CircularProgress /></TableCell></TableRow>
              ) : spendings.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center">Nenhuma despesa encontrada.</TableCell></TableRow>
              ) : (
                spendings.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{dayjs(s.date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell>{s.referenceDate ? dayjs(s.referenceDate).format('MM/YYYY') : '-'}</TableCell>
                    <TableCell>{s.description || '-'}</TableCell>
                    <TableCell>{s.typeName}</TableCell>
                    <TableCell>{s.wasPaid ? 'Pago' : 'Pendente'}</TableCell>
                    <TableCell>{Number(s.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                    <TableCell align="right">
                      <IconButton color="info" onClick={() => handleOpenAudit(s)} title="Ver Histórico"><HistoryIcon /></IconButton>
                      <IconButton color="primary" onClick={() => handleEdit(s)}><EditIcon /></IconButton>
                      <IconButton color="error" onClick={() => setConfirmTarget({ type: 'spending', id: s.id })}><DeleteIcon /></IconButton>
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
          count={totalElements}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Itens por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
        />


        <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: "750px", maxWidth: "90vw" } }}>
          <form onSubmit={handleSave}>
            <DialogTitle>{editingId ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker label="Data do Movimento" value={formDate} onChange={(newValue) => setFormDate(newValue)} format="DD/MM/YYYY" slotProps={{ textField: { fullWidth: true, margin: 'normal', required: true } }} />
                <DatePicker label="Competência (Opcional)" value={formRefDate} onChange={(newValue) => setFormRefDate(newValue)} format="MM/YYYY" views={['year', 'month']} slotProps={{ textField: { fullWidth: true, margin: 'normal' } }} />
              </Box>
              <TextField fullWidth label="Descrição" value={formDesc} onChange={e => setFormDesc(e.target.value)} margin="normal" />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2, mb: 1 }}>
                <TextField fullWidth select label="Tipo" value={formTypeId} onChange={e => setFormTypeId(e.target.value)} required margin="none">
                  {types.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                </TextField>
                <IconButton color="primary" onClick={() => setOpenTypeModal(true)} sx={{ bgcolor: 'action.hover', borderRadius: 1 }} title="Adicionar novo tipo">
                  <AddIcon />
                </IconButton>
                {formTypeId && (
                  <IconButton color="error" onClick={() => setConfirmTarget({ type: 'type', id: formTypeId })} sx={{ bgcolor: 'action.hover', borderRadius: 1 }} title="Excluir tipo selecionado">
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
              <TextField fullWidth type="number" label="Valor" value={formValue} onChange={e => setFormValue(e.target.value)} required margin="normal" inputProps={{ step: '0.01' }} />
              <FormControlLabel control={<Checkbox checked={formWasPaid} onChange={e => setFormWasPaid(e.target.checked)} />} label="Já foi pago" sx={{ mt: 1 }} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="contained">Salvar</Button>
            </DialogActions>
          </form>
        </Dialog>

        <Dialog open={openTypeModal} onClose={() => setOpenTypeModal(false)}>
          <form onSubmit={handleSaveType}>
            <DialogTitle>Novo Tipo de Despesa</DialogTitle>
            <DialogContent dividers>
              <TextField autoFocus fullWidth label="Nome do Tipo" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} required margin="normal" />
              <TextField fullWidth select label="Categoria da Regra 50/30/20" value={newTypeCategory} onChange={e => setNewTypeCategory(e.target.value)} required margin="normal">
                <MenuItem value="ESSENTIAL">Gastos Essenciais (50%)</MenuItem>
                <MenuItem value="PERSONAL">Gastos Pessoais (30%)</MenuItem>
                <MenuItem value="SAVINGS">Economia/Investimento (20%)</MenuItem>
              </TextField>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenTypeModal(false)}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={typeLoading}>
                {typeLoading ? <CircularProgress size={24} /> : 'Salvar'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
      
      
      <Dialog open={Boolean(auditTarget)} onClose={() => setAuditTarget(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" /> Histórico de Auditoria: {auditTarget?.id}
        </DialogTitle>
        <DialogContent dividers>
          {isLoadingAudit ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
          ) : auditHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              Nenhum registro de auditoria encontrado.
            </Typography>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Rev. #</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Data/Hora (Modificação)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Autor</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Valor Salvo (R$)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditHistory.map((rev) => (
                    <TableRow key={rev.revision} hover>
                      <TableCell sx={{ fontWeight: 600 }}>#{rev.revision}</TableCell>
                      <TableCell>{getRevisionTypeChip(rev.revisionType)}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {rev.changedAt ? new Date(rev.changedAt).toLocaleString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{rev.changedBy || 'Sistema'}</TableCell>
                      <TableCell>{rev.value !== undefined ? Number(rev.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAuditTarget(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      
      <Dialog open={openBatchModal} onClose={() => setOpenBatchModal(false)} maxWidth="lg" fullWidth>
        <form onSubmit={handleSaveBatch}>
          <DialogTitle>Lançamento em Lote de Despesas</DialogTitle>
          <DialogContent dividers>
            {batchItems.map((item, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                <DatePicker label="Data" value={item.date} onChange={(val) => handleBatchChange(index, 'date', val)} format="DD/MM/YYYY" slotProps={{ textField: { required: true, size: 'small', sx: { width: 140 } } }} />
                <DatePicker label="Comp." value={item.referenceDate} onChange={(val) => handleBatchChange(index, 'referenceDate', val)} format="MM/YYYY" views={['year', 'month']} slotProps={{ textField: { size: 'small', sx: { width: 120 } } }} />
                <TextField select label="Tipo" value={item.typeId} onChange={e => handleBatchChange(index, 'typeId', e.target.value)} required size="small" sx={{ width: 160 }}>
                  {types.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                </TextField>
                <TextField label="Descrição" value={item.description} onChange={e => handleBatchChange(index, 'description', e.target.value)} required size="small" sx={{ flexGrow: 1 }} />
                <TextField type="number" label="Valor" value={item.value} onChange={e => handleBatchChange(index, 'value', e.target.value)} required size="small" inputProps={{ step: '0.01' }} sx={{ width: 110 }} />
                <FormControlLabel control={<Checkbox checked={item.wasPaid} onChange={e => handleBatchChange(index, 'wasPaid', e.target.checked)} size="small" />} label="Pago" sx={{ ml: 1, mr: 0 }} />
                <IconButton color="error" onClick={() => handleRemoveBatchLine(index)} disabled={batchItems.length === 1}><DeleteIcon /></IconButton>
              </Box>
            ))}
            <Button variant="text" startIcon={<AddIcon />} onClick={handleAddBatchLine}>Adicionar linha</Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenBatchModal(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={batchLoading}>
              {batchLoading ? <CircularProgress size={24} /> : 'Salvar Lote'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmTarget !== null}
        title={confirmTarget?.type === 'type' ? 'Excluir Tipo de Despesa' : 'Excluir Despesa'}
        message={confirmTarget?.type === 'type' ? 'Tem certeza que deseja excluir este tipo? Esta ação não pode ser desfeita.' : 'Tem certeza que deseja excluir este lançamento financeiro? Esta ação não pode ser desfeita.'}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => confirmTarget && (confirmTarget.type === 'type' ? executeDeleteType(confirmTarget.id) : executeDelete(confirmTarget.id))}
      />
    </Box>
  );
};

export default Despesas;

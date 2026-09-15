import { FC, useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Autocomplete, Chip, Typography, TablePagination, TableSortLabel, Tabs, Tab, Checkbox, FormControlLabel } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, History as HistoryIcon } from '@mui/icons-material';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import AppNavbar from '@/components/AppNavbar';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useSnackbar } from '@/hooks/useSnackbar';
import { RevenueDTO, RevenueTypeDTO , RevenueRevisionDTO } from '@/interfaces/budget';
import { getErrorMessage } from '@/utils/errors';
import dayjs, { Dayjs } from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';


interface BatchItem { date: dayjs.Dayjs | null; referenceDate: dayjs.Dayjs | null; typeId: string; value: string; }
interface BatchRevenueModalProps { open: boolean; onClose: () => void; types: RevenueTypeDTO[]; onSaved: () => void; api: import('axios').AxiosInstance; showSnackbar: (msg: string, sev: 'success' | 'error') => void; }
const BatchRevenueModal = ({ open, onClose, types, onSaved, api, showSnackbar }: BatchRevenueModalProps) => {
  const [tabIndex, setTabIndex] = useState(0);

  const [batchItems, setBatchItems] = useState<BatchItem[]>([{ date: dayjs(), referenceDate: null, typeId: '', value: '' }]);
  const [annualItem, setAnnualItem] = useState<BatchItem>({ date: dayjs(), referenceDate: null, typeId: '', value: '' });

  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTabIndex(0);
      setBatchItems([{ date: dayjs(), referenceDate: null, typeId: '', value: '' }]);
      setAnnualItem({ date: dayjs(), referenceDate: null, typeId: '', value: '' });
    }
  }, [open]);

  const handleBatchChange = (index: number, field: string, val: unknown) => {
    setBatchItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: val } : item));
  };

  const handleAddBatchLine = () => {
    setBatchItems(prev => {
      const lastItem = prev.length > 0 ? prev[prev.length - 1] : null;
      return [...prev, { 
        ...({ date: dayjs(), referenceDate: null, typeId: '', value: '' }),
        date: lastItem ? lastItem.date : dayjs(), 
        referenceDate: lastItem ? lastItem.referenceDate : null 
      }];
    });
  };

  const handleRemoveBatchLine = (index: number) => {
    setBatchItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveMonthly = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchLoading(true);
    try {
      const payload = batchItems.map(item => ({
        ...item,
        date: item.date ? item.date.format('YYYY-MM-DD') : null,
        referenceDate: item.referenceDate ? item.referenceDate.format('YYYY-MM-DD') : null,
        value: Number(item.value)
      }));
      await api.post('/api/v1/revenues/batch', { revenues: payload });
      showSnackbar('Receitas mensais em lote cadastradas com sucesso!', 'success');
      onClose();
      onSaved();
    } catch (e: unknown) {
      showSnackbar(`Erro ao salvar lote: ${getErrorMessage(e)}`, 'error');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleSaveAnnual = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchLoading(true);
    try {
      const payload = {
        typeId: annualItem.typeId,
        value: Number(annualItem.value),
        year: annualItem.date ? annualItem.date.year() : dayjs().year(),
        startMonth: annualItem.date ? annualItem.date.month() + 1 : 1,
        dayOfMonth: annualItem.date ? annualItem.date.date() : 1
      };
      await api.post('/api/v1/revenues/batch/annual', payload);
      showSnackbar('Lote anual de receitas cadastrado com sucesso!', 'success');
      onClose();
      onSaved();
    } catch (e: unknown) {
      showSnackbar(`Erro ao salvar lote anual: ${getErrorMessage(e)}`, 'error');
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Lançamento em Lote de Receitas</DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tabIndex} onChange={(_, val: number) => setTabIndex(val)} centered>
          <Tab label="Lote Mensal (Linhas)" />
          <Tab label="Lote Anual (Recorrente)" />
        </Tabs>
      </Box>

      {tabIndex === 0 && (
        <form onSubmit={handleSaveMonthly}>
          <DialogContent dividers>
            {batchItems.map((item, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                <DatePicker sx={{ minWidth: 150 }} label="Data" value={item.date} onChange={(val) => handleBatchChange(index, 'date', val)} format="DD/MM/YYYY" slotProps={{ textField: { required: true, size: 'small', sx: { width: 180 } } }} />
                <DatePicker label="Comp. (Opc)" value={item.referenceDate} onChange={(val) => handleBatchChange(index, 'referenceDate', val)} format="MM/YYYY" views={['year', 'month']} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
                <Autocomplete
                  options={types}
                  getOptionLabel={(option) => option.name}
                  value={types.find((t: RevenueTypeDTO) => t.id === item.typeId) || null}
                  onChange={(_, newValue) => handleBatchChange(index, 'typeId', newValue ? newValue.id : '')}
                  renderInput={(params) => <TextField {...params} label="Tipo" required size="small" />}
                  sx={{ width: 220 }}
                />
                <TextField type="number" label="Valor" value={item.value} onChange={e => handleBatchChange(index, 'value', e.target.value)} required size="small" inputProps={{ step: '0.01' }} sx={{ width: 140 }} />
                <IconButton color="error" onClick={() => handleRemoveBatchLine(index)} disabled={batchItems.length === 1}><DeleteIcon /></IconButton>
              </Box>
            ))}
            <Button variant="text" startIcon={<AddIcon />} onClick={handleAddBatchLine}>Adicionar linha</Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={batchLoading}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={batchLoading}>
              {batchLoading ? <CircularProgress size={24} /> : 'Salvar Mensal'}
            </Button>
          </DialogActions>
        </form>
      )}

      {tabIndex === 1 && (
        <form onSubmit={handleSaveAnnual}>
          <DialogContent dividers>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Cria uma receita recorrente para cada mês até o fim do ano com base nos dados abaixo.
              A data inicial define o <strong>Dia</strong>, <strong>Mês inicial</strong> e <strong>Ano</strong>.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <DatePicker sx={{ minWidth: 150 }} label="Data Inicial" value={annualItem.date} onChange={(val) => setAnnualItem({...annualItem, date: val})} format="DD/MM/YYYY" slotProps={{ textField: { required: true, size: 'small', sx: { width: 180 } } }} />
              <Autocomplete
                options={types}
                getOptionLabel={(option) => option.name}
                value={types.find((t: RevenueTypeDTO) => t.id === annualItem.typeId) || null}
                onChange={(_, newValue) => setAnnualItem({...annualItem, typeId: newValue ? newValue.id : ''})}
                renderInput={(params) => <TextField {...params} label="Tipo" required size="small" />}
                sx={{ width: 220 }}
              />
              <TextField type="number" label="Valor" value={annualItem.value} onChange={e => setAnnualItem({...annualItem, value: e.target.value})} required size="small" inputProps={{ step: '0.01' }} sx={{ width: 140 }} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={batchLoading}>Cancelar</Button>
            <Button type="submit" variant="contained" color="secondary" disabled={batchLoading}>
              {batchLoading ? <CircularProgress size={24} /> : 'Salvar Anual'}
            </Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
};
const Receitas: FC = () => {
  const api = useAxiosWithAuth();
  const { showSnackbar } = useSnackbar();
  
  const [revenues, setRevenues] = useState<RevenueDTO[]>([]);
  const [types, setTypes] = useState<RevenueTypeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [auditTarget, setAuditTarget] = useState<RevenueDTO | null>(null);
  const [auditHistory, setAuditHistory] = useState<RevenueRevisionDTO[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const [page, setPage] = useState(0);
  const today = new Date();
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const [year, setYear] = useState<number>(today.getFullYear());
  const [appliedMonth, setAppliedMonth] = useState<number>(today.getMonth() + 1);
  const [appliedYear, setAppliedYear] = useState<number>(today.getFullYear());
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [totalElements, setTotalElements] = useState(0);
  const [orderBy, setOrderBy] = useState('date');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');

  
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState<Dayjs | null>(null);
  const [formRefDate, setFormRefDate] = useState<Dayjs | null>(null);
  const [formValue, setFormValue] = useState('');
  const [formTypeId, setFormTypeId] = useState('');

  const [openBatchModal, setOpenBatchModal] = useState(false);
    
  
  const [openTypeModal, setOpenTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeInclude, setNewTypeInclude] = useState(true);
  const [newTypeMonthlyInclude, setNewTypeMonthlyInclude] = useState(true);
  const [typeLoading, setTypeLoading] = useState(false);

  const [confirmTarget, setConfirmTarget] = useState<{ type: 'revenue' | 'type', id: string } | null>(null);

  
  const handleOpenAudit = async (item: RevenueDTO) => {
    setAuditTarget(item);
    setIsLoadingAudit(true);
    setAuditHistory([]);
    try {
      const res = await api.get(`/api/v1/revenues/${item.id}/history`);
      setAuditHistory(res.data || []);
    } catch (e: unknown) {
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
      const [revRes, typeRes] = await Promise.all([
        api.get('/api/v1/revenues', { params: { page, size: rowsPerPage, sort: `${orderBy},${orderDirection}`, month: appliedMonth, year: appliedYear } }),
        api.get('/api/v1/revenue-types')
      ]);
      setRevenues(Array.isArray(revRes.data?.content) ? revRes.data.content : []);
      setTotalElements(revRes.data?.totalElements || 0);
      setTypes(Array.isArray(typeRes.data) ? typeRes.data : []);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api, page, rowsPerPage, orderBy, orderDirection, appliedMonth, appliedYear]);

  
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
    setFormValue('');
    setFormTypeId('');
    setOpen(true);
  };

  const handleEdit = (rev: RevenueDTO) => {
    setEditingId(rev.id);
    setFormDate(dayjs(rev.date));
    setFormRefDate(rev.referenceDate ? dayjs(rev.referenceDate) : null);
    setFormValue(rev.value.toString());
    setFormTypeId(rev.typeId);
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        date: formDate?.format('YYYY-MM-DD') || '',
        referenceDate: formRefDate ? formRefDate.format('YYYY-MM-DD') : null,
        value: Number(formValue),
        typeId: formTypeId
      };
      
      if (editingId) {
        await api.put(`/api/v1/revenues/${editingId}`, payload);
        showSnackbar('Receita atualizada com sucesso!', 'success');
      } else {
        await api.post('/api/v1/revenues', payload);
        showSnackbar('Receita criada com sucesso!', 'success');
      }
      
      setOpen(false);
      loadData();
    } catch (e: unknown) {
      console.error(e);
      showSnackbar(`Erro: ${getErrorMessage(e) || 'Desconhecido'}`, 'error');
    }
  };

  const executeDelete = async (id: string) => {
    try {
      await api.delete(`/api/v1/revenues/${id}`);
      loadData();
      showSnackbar('Receita excluída com sucesso!', 'success');
    } catch (e: unknown) {
      console.error(e);
      showSnackbar('Erro ao excluir receita', 'error');
    } finally {
      setConfirmTarget(null);
    }
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setTypeLoading(true);
    try {
      const res = await api.post<RevenueTypeDTO>('/api/v1/revenue-types', { name: newTypeName });
      setTypes(prev => [...prev, res.data]);
      setFormTypeId(res.data.id);
      setOpenTypeModal(false);
      setNewTypeName('');
    setNewTypeInclude(true);
    setNewTypeMonthlyInclude(true);
      showSnackbar('Tipo criado com sucesso!', 'success');
    } catch (e: unknown) {
      console.error(e);
      showSnackbar(`Erro: ${getErrorMessage(e) || 'Desconhecido'}`, 'error');
    } finally {
      setTypeLoading(false);
    }
  };

  
  
  
  
  
  
  const executeDeleteType = async (id: string) => {
    try {
      await api.delete(`/api/v1/revenue-types/${id}`);
      setTypes(prev => prev.filter(t => t.id !== id));
      setFormTypeId('');
      showSnackbar('Tipo excluído com sucesso!', 'success');
    } catch (e: unknown) {
      console.error(e);
      showSnackbar(`Erro ao excluir tipo: ${getErrorMessage(e) || 'Em uso por receitas existentes'}`, 'error');
    } finally {
      setConfirmTarget(null);
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar title="Receitas" showBackButton backPath="/financas" backLabel="Voltar" />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="outlined" sx={{ mr: 2 }} onClick={() => setOpenBatchModal(true)}>Lançamento em Lote</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNew}>Nova Receita</Button>
        </Box>

        
        <Paper elevation={1} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Typography variant="subtitle1">Competência:</Typography>
          <TextField select label="Mês" value={month} onChange={e => setMonth(Number(e.target.value))} size="small">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <MenuItem key={m} value={m}>{m.toString().padStart(2, '0')}</MenuItem>
            ))}
          </TextField>
          <TextField type="number" label="Ano" value={year} onChange={e => setYear(Number(e.target.value))} size="small" sx={{ width: 100 }} />
          <Button variant="contained" onClick={() => { setAppliedMonth(month); setAppliedYear(year); setPage(0); }}>Filtrar</Button>
        </Paper>

        <TableContainer component={Paper}>
          <Table size="small" sx={{ '& .MuiTableCell-root': { fontSize: '0.95rem', py: 1 } }}>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              
            <TableRow>
              <TableCell>
                <TableSortLabel active={orderBy === 'date'} direction={orderBy === 'date' ? orderDirection : 'asc'} onClick={() => handleRequestSort('date')}>Data</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={orderBy === 'referenceDate'} direction={orderBy === 'referenceDate' ? orderDirection : 'asc'} onClick={() => handleRequestSort('referenceDate')}>Competência</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={orderBy === 'type.name'} direction={orderBy === 'type.name' ? orderDirection : 'asc'} onClick={() => handleRequestSort('type.name')}>Tipo</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={orderBy === 'value'} direction={orderBy === 'value' ? orderDirection : 'asc'} onClick={() => handleRequestSort('value')}>Valor (R$)</TableSortLabel>
              </TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>

            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow>
              ) : revenues.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">Nenhuma receita encontrada.</TableCell></TableRow>
              ) : (
                revenues.map(rev => (
                  <TableRow key={rev.id}>
                    <TableCell>{dayjs(rev.date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell>{rev.referenceDate ? dayjs(rev.referenceDate).format('MM/YYYY') : '-'}</TableCell>
                    <TableCell>{rev.typeName}</TableCell>
                    <TableCell>{Number(rev.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                    <TableCell align="center">
                      <IconButton color="info" onClick={() => handleOpenAudit(rev)} title="Ver Histórico"><HistoryIcon /></IconButton>
                      <IconButton color="primary" onClick={() => handleEdit(rev)}><EditIcon /></IconButton>
                      <IconButton color="error" onClick={() => setConfirmTarget({ type: 'revenue', id: rev.id })}><DeleteIcon /></IconButton>
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
            <DialogTitle>{editingId ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker label="Data do Lançamento" value={formDate} onChange={(newValue) => setFormDate(newValue)} format="DD/MM/YYYY" slotProps={{ textField: { fullWidth: true, margin: 'normal', required: true, size: 'small' } }} />
                <DatePicker label="Competência (Opcional)" value={formRefDate} onChange={(newValue) => setFormRefDate(newValue)} format="MM/YYYY" views={['year', 'month']} slotProps={{ textField: { fullWidth: true, margin: 'normal', size: 'small' } }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2, mb: 1 }}>
                <Autocomplete
                  options={types}
                  getOptionLabel={(option) => option.name}
                  value={types.find((t: RevenueTypeDTO) => t.id === formTypeId) || null}
                  onChange={(_, newValue) => setFormTypeId(newValue ? newValue.id : '')}
                  renderInput={(params) => <TextField {...params} label="Tipo" required margin="none" size="small" />}
                  sx={{ flexGrow: 1 }}
                />
                <IconButton color="primary" onClick={() => setOpenTypeModal(true)} sx={{ bgcolor: 'action.hover', borderRadius: 1 }} title="Adicionar novo tipo">
                  <AddIcon />
                </IconButton>
                
              </Box>
              <TextField fullWidth type="number" label="Valor" size="small" value={formValue} onChange={e => setFormValue(e.target.value)} required margin="dense" inputProps={{ step: '0.01' }} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="contained">Salvar</Button>
            </DialogActions>
          </form>
        </Dialog>
      
        <Dialog open={openTypeModal} onClose={() => setOpenTypeModal(false)}>
          <form onSubmit={handleSaveType}>
            <DialogTitle>Novo Tipo de Receita</DialogTitle>
            <DialogContent dividers>
              <TextField autoFocus fullWidth label="Nome do Tipo" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} required margin="dense" />
              <FormControlLabel control={<Checkbox checked={newTypeInclude} onChange={e => setNewTypeInclude(e.target.checked)} />} label="Incluir na contagem anual" sx={{ mt: 1 }} />
              <FormControlLabel control={<Checkbox checked={newTypeMonthlyInclude} onChange={e => setNewTypeMonthlyInclude(e.target.checked)} />} label="Incluir na contagem mensal" sx={{ mt: 1 }} />
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

      
      <BatchRevenueModal open={openBatchModal} onClose={() => setOpenBatchModal(false)} types={types} onSaved={loadData} api={api} showSnackbar={showSnackbar} />

      <ConfirmDialog
        open={confirmTarget !== null}
        title={confirmTarget?.type === 'type' ? 'Excluir Tipo de Receita' : 'Excluir Receita'}
        message={confirmTarget?.type === 'type' ? 'Tem certeza que deseja excluir este tipo? Esta ação não pode ser desfeita.' : 'Tem certeza que deseja excluir este lançamento financeiro? Esta ação não pode ser desfeita.'}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => confirmTarget && (confirmTarget.type === 'type' ? executeDeleteType(confirmTarget.id) : executeDelete(confirmTarget.id))}
      />
    </Box>
  );
};

export default Receitas;

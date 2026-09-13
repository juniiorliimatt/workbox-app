import dayjs, { Dayjs } from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { FC, useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress,
  FormControlLabel, Checkbox
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import AppNavbar from '@/components/AppNavbar';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SpendingDTO, SpendingTypeDTO } from '@/interfaces/budget';

const Despesas: FC = () => {
  const api = useAxiosWithAuth();
  const { showSnackbar } = useSnackbar();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [spendings, setSpendings] = useState<SpendingDTO[]>([]);
  const [types, setTypes] = useState<SpendingTypeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  const [formDate, setFormDate] = useState<Dayjs | null>(null);
  const [formDesc, setFormDesc] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formTypeId, setFormTypeId] = useState('');
  const [formWasPaid, setFormWasPaid] = useState(false);

  const [openTypeModal, setOpenTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCategory, setNewTypeCategory] = useState('ESSENTIAL');
  const [typeLoading, setTypeLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [spendRes, typeRes] = await Promise.all([
        api.get('/api/v1/spendings?size=1000'),
        api.get('/api/v1/spending-types')
      ]);
      setSpendings(Array.isArray(spendRes.data?.content) ? spendRes.data.content : []);
      setTypes(Array.isArray(typeRes.data) ? typeRes.data : []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenNew = () => {
    setEditingId(null);
    setFormDate(dayjs());
    setFormDesc('');
    setFormValue('');
    setFormTypeId('');
    setFormWasPaid(false);
    setOpen(true);
  };

  const handleEdit = (s: SpendingDTO) => {
    setEditingId(s.id);
    setFormDate(dayjs(s.date));
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

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta despesa?')) return;
    try {
      await api.delete(`/api/v1/spendings/${id}`);
      loadData();
      showSnackbar('Despesa excluída com sucesso!', 'success');
    } catch (e: any) {
      console.error(e);
      showSnackbar(`Erro ao excluir despesa: ${e?.response?.data?.message || 'Desconhecido'}`, 'error');
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

  const handleDeleteType = async () => {
    if (!formTypeId) return;
    if (!confirm('Deseja excluir este tipo de despesa?')) return;
    try {
      await api.delete(`/api/v1/spending-types/${formTypeId}`);
      setTypes(prev => prev.filter(t => t.id !== formTypeId));
      setFormTypeId('');
      showSnackbar('Tipo excluído com sucesso!', 'success');
    } catch (e: any) {
      console.error(e);
      showSnackbar(`Erro ao excluir tipo: ${e?.response?.data?.message || 'Em uso por despesas existentes'}`, 'error');
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar title="Despesas" showBackButton backPath="/financas" backLabel="Voltar" />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNew}>Nova Despesa</Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Situação</TableCell>
                <TableCell>Valor (R$)</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
              ) : spendings.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">Nenhuma despesa encontrada.</TableCell></TableRow>
              ) : (
                spendings.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{dayjs(s.date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell>{s.description || '-'}</TableCell>
                    <TableCell>{s.typeName}</TableCell>
                    <TableCell>{s.wasPaid ? 'Pago' : 'Pendente'}</TableCell>
                    <TableCell>{Number(s.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                    <TableCell align="right">
                      <IconButton color="primary" onClick={() => handleEdit(s)}><EditIcon /></IconButton>
                      <IconButton color="error" onClick={() => handleDelete(s.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: "750px", maxWidth: "90vw" } }}>
          <form onSubmit={handleSave}>
            <DialogTitle>{editingId ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
            <DialogContent dividers>
              <DatePicker label="Data" value={formDate} onChange={(newValue) => setFormDate(newValue)} format="DD/MM/YYYY" slotProps={{ textField: { fullWidth: true, margin: 'normal', required: true } }} />
              <TextField fullWidth label="Descrição" value={formDesc} onChange={e => setFormDesc(e.target.value)} margin="normal" />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2, mb: 1 }}>
                <TextField fullWidth select label="Tipo" value={formTypeId} onChange={e => setFormTypeId(e.target.value)} required margin="none">
                  {types.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                </TextField>
                <IconButton color="primary" onClick={() => setOpenTypeModal(true)} sx={{ bgcolor: 'action.hover', borderRadius: 1 }} title="Adicionar novo tipo">
                  <AddIcon />
                </IconButton>
                {formTypeId && (
                  <IconButton color="error" onClick={handleDeleteType} sx={{ bgcolor: 'action.hover', borderRadius: 1 }} title="Excluir tipo selecionado">
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
    </Box>
  );
};
export default Despesas;

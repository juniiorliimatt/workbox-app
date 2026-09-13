import { FC, useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import AppNavbar from '@/components/AppNavbar';
import { useSnackbar } from '@/hooks/useSnackbar';
import { RevenueDTO, RevenueTypeDTO } from '@/interfaces/budget';

const Receitas: FC = () => {
  const api = useAxiosWithAuth();
  const { showSnackbar } = useSnackbar();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revenues, setRevenues] = useState<RevenueDTO[]>([]);
  const [types, setTypes] = useState<RevenueTypeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  const [formDate, setFormDate] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formTypeId, setFormTypeId] = useState('');
  
  const [openTypeModal, setOpenTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [typeLoading, setTypeLoading] = useState(false);

  const loadData = useCallback(async () => {
    
    setLoading(true);
    try {
      const [revRes, typeRes] = await Promise.all([
        api.get('/api/v1/revenues?size=1000'),
        api.get('/api/v1/revenue-types')
      ]);
      setRevenues(Array.isArray(revRes.data?.content) ? revRes.data.content : []);
      setTypes(Array.isArray(typeRes.data) ? typeRes.data : []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        date: formDate,
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
    } catch (e: any) {
      console.error(e);
      showSnackbar(`Erro: ${e?.response?.data?.message || e?.message || 'Desconhecido'}`, 'error');
    }
  };

  const handleEdit = (rev: RevenueDTO) => {
    setEditingId(rev.id);
    setFormDate(rev.date);
    setFormValue(rev.value.toString());
    setFormTypeId(rev.typeId);
    setOpen(true);
  };
  const handleOpenNew = () => {
    setEditingId(null);
    setFormDate('');
    setFormValue('');
    setFormTypeId('');
    setOpen(true);
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
    } catch (e: any) {
      console.error(e);
      showSnackbar(`Erro: ${e?.response?.data?.message || e?.message || 'Desconhecido'}`, 'error');
    } finally {
      setTypeLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir?')) return;
    try {
      await api.delete(`/api/v1/revenues/${id}`);
      loadData();
      showSnackbar('Receita excluída com sucesso!', 'success');
    } catch (e: any) {
      console.error(e);
    }
  };

  

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar title="Receitas" showBackButton backPath="/financas" backLabel="Voltar" />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNew}>Nova Receita</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Valor (R$)</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} align="center"><CircularProgress /></TableCell></TableRow>
            ) : revenues.length === 0 ? (
              <TableRow><TableCell colSpan={4} align="center">Nenhuma receita encontrada.</TableCell></TableRow>
            ) : (
              revenues.map(rev => (
                <TableRow key={rev.id}>
                  <TableCell>{new Date(rev.date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{rev.typeName}</TableCell>
                  <TableCell>{Number(rev.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" onClick={() => handleEdit(rev)}><EditIcon /></IconButton>
                    <IconButton color="error" onClick={() => handleDelete(rev.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: "750px", maxWidth: "90vw" } }}>
        <form onSubmit={handleSave}>
          <DialogTitle>{editingId ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
          <DialogContent dividers>
            <TextField fullWidth type="date" label="Data" value={formDate} onChange={e => setFormDate(e.target.value)} required margin="normal" InputLabelProps={{ shrink: true }} />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2, mb: 1 }}>
              <TextField fullWidth select label="Tipo" value={formTypeId} onChange={e => setFormTypeId(e.target.value)} required margin="none">
                {types.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </TextField>
              <IconButton color="primary" onClick={() => setOpenTypeModal(true)} sx={{ bgcolor: 'action.hover', borderRadius: 1 }} title="Adicionar novo tipo">
                <AddIcon />
              </IconButton>
            </Box>
            <TextField fullWidth type="number" label="Valor" value={formValue} onChange={e => setFormValue(e.target.value)} required margin="normal" inputProps={{ step: '0.01' }} />
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
            <TextField autoFocus fullWidth label="Nome do Tipo" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} required margin="normal" />
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
export default Receitas;

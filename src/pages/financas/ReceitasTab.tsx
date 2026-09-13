import { FC, useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import api from '@/services/api';
import { RevenueDTO, RevenueTypeDTO } from '@/interfaces/budget';

interface Props {
  active: boolean;
}

const ReceitasTab: FC<Props> = ({ active }) => {
  const [revenues, setRevenues] = useState<RevenueDTO[]>([]);
  const [types, setTypes] = useState<RevenueTypeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  const [formDate, setFormDate] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formTypeId, setFormTypeId] = useState('');

  const loadData = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    try {
      const [revRes, typeRes] = await Promise.all([
        api.get('/api/v1/revenues?size=1000'),
        api.get('/api/v1/revenue-types')
      ]);
      setRevenues(revRes.data.content || []);
      setTypes(typeRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/v1/revenues', {
        date: formDate,
        value: Number(formValue),
        typeId: formTypeId
      });
      setOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar receita');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir?')) return;
    try {
      await api.delete(`/api/v1/revenues/${id}`);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (!active) return null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Nova Receita</Button>
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
                    <IconButton color="error" onClick={() => handleDelete(rev.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <form onSubmit={handleSave}>
          <DialogTitle>Nova Receita</DialogTitle>
          <DialogContent dividers>
            <TextField fullWidth type="date" label="Data" value={formDate} onChange={e => setFormDate(e.target.value)} required margin="normal" InputLabelProps={{ shrink: true }} />
            <TextField fullWidth select label="Tipo" value={formTypeId} onChange={e => setFormTypeId(e.target.value)} required margin="normal">
              {types.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField>
            <TextField fullWidth type="number" label="Valor" value={formValue} onChange={e => setFormValue(e.target.value)} required margin="normal" inputProps={{ step: '0.01' }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">Salvar</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
export default ReceitasTab;

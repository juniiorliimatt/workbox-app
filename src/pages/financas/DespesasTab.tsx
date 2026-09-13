import { FC, useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress,
  FormControlLabel, Checkbox
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import api from '@/services/api';
import { SpendingDTO, SpendingTypeDTO } from '@/interfaces/budget';

interface Props {
  active: boolean;
}

const DespesasTab: FC<Props> = ({ active }) => {
  const [spendings, setSpendings] = useState<SpendingDTO[]>([]);
  const [types, setTypes] = useState<SpendingTypeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  const [formDate, setFormDate] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formTypeId, setFormTypeId] = useState('');
  const [formWasPaid, setFormWasPaid] = useState(false);

  const loadData = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    try {
      const [spendRes, typeRes] = await Promise.all([
        api.get('/api/v1/spendings?size=1000'),
        api.get('/api/v1/spending-types')
      ]);
      setSpendings(spendRes.data.content || []);
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
      await api.post('/api/v1/spendings', {
        date: formDate,
        description: formDesc,
        value: Number(formValue),
        typeId: formTypeId,
        wasPaid: formWasPaid
      });
      setOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar despesa');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir?')) return;
    try {
      await api.delete(`/api/v1/spendings/${id}`);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (!active) return null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Nova Despesa</Button>
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
                  <TableCell>{new Date(s.date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{s.description || '-'}</TableCell>
                  <TableCell>{s.typeName}</TableCell>
                  <TableCell>{s.wasPaid ? 'Pago' : 'Pendente'}</TableCell>
                  <TableCell>{Number(s.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                  <TableCell align="right">
                    <IconButton color="error" onClick={() => handleDelete(s.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <form onSubmit={handleSave}>
          <DialogTitle>Nova Despesa</DialogTitle>
          <DialogContent dividers>
            <TextField fullWidth type="date" label="Data" value={formDate} onChange={e => setFormDate(e.target.value)} required margin="normal" InputLabelProps={{ shrink: true }} />
            <TextField fullWidth label="Descrição" value={formDesc} onChange={e => setFormDesc(e.target.value)} margin="normal" />
            <TextField fullWidth select label="Tipo" value={formTypeId} onChange={e => setFormTypeId(e.target.value)} required margin="normal">
              {types.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField>
            <TextField fullWidth type="number" label="Valor" value={formValue} onChange={e => setFormValue(e.target.value)} required margin="normal" inputProps={{ step: '0.01' }} />
            <FormControlLabel control={<Checkbox checked={formWasPaid} onChange={e => setFormWasPaid(e.target.checked)} />} label="Já foi pago" />
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
export default DespesasTab;

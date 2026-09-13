import { FC, useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress,
  Grid, Typography
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import AppNavbar from '@/components/AppNavbar';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useSnackbar } from '@/hooks/useSnackbar';
import { RevenueTypeDTO, SpendingTypeDTO } from '@/interfaces/budget';

const GerenciarTipos: FC = () => {
  const api = useAxiosWithAuth();
  const { showSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [revenueTypes, setRevenueTypes] = useState<RevenueTypeDTO[]>([]);
  const [spendingTypes, setSpendingTypes] = useState<SpendingTypeDTO[]>([]);

  // Modals
  const [openRevModal, setOpenRevModal] = useState(false);
  const [openSpendModal, setOpenSpendModal] = useState(false);

  const [revFormId, setRevFormId] = useState<string | null>(null);
  const [revFormName, setRevFormName] = useState('');
  
  const [spendFormId, setSpendFormId] = useState<string | null>(null);
  const [spendFormName, setSpendFormName] = useState('');
  const [spendFormCat, setSpendFormCat] = useState('ESSENTIAL');
  
  const [confirmTarget, setConfirmTarget] = useState<{ origin: 'rev' | 'spend', id: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [revRes, spendRes] = await Promise.all([
        api.get('/api/v1/revenue-types'),
        api.get('/api/v1/spending-types')
      ]);
      setRevenueTypes(Array.isArray(revRes.data) ? revRes.data : []);
      setSpendingTypes(Array.isArray(spendRes.data) ? spendRes.data : []);
    } catch (e: any) {
      console.error(e);
      showSnackbar('Erro ao carregar os tipos.', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, showSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Revenue Types CRUD
  const handleOpenRev = (t?: RevenueTypeDTO) => {
    if (t) {
      setRevFormId(t.id);
      setRevFormName(t.name);
    } else {
      setRevFormId(null);
      setRevFormName('');
    }
    setOpenRevModal(true);
  };

  const handleSaveRev = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = { name: revFormName };
      if (revFormId) {
        await api.put(`/api/v1/revenue-types/${revFormId}`, payload);
        showSnackbar('Tipo de receita atualizado com sucesso!', 'success');
      } else {
        await api.post('/api/v1/revenue-types', payload);
        showSnackbar('Tipo de receita criado com sucesso!', 'success');
      }
      setOpenRevModal(false);
      loadData();
    } catch (e: any) {
      console.error(e);
      showSnackbar(`Erro: ${e?.response?.data?.message || 'Falha ao salvar'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const executeDeleteRev = async (id: string) => {
    try {
      await api.delete(`/api/v1/revenue-types/${id}`);
      showSnackbar('Tipo de receita excluído!', 'success');
      loadData();
    } catch (e: any) {
      console.error(e);
      showSnackbar(`Erro: ${e?.response?.data?.message || 'Em uso ou não encontrado'}`, 'error');
    } finally {
      setConfirmTarget(null);
    }
  };

  // Spending Types CRUD
  const handleOpenSpend = (t?: SpendingTypeDTO) => {
    if (t) {
      setSpendFormId(t.id);
      setSpendFormName(t.name);
      setSpendFormCat(t.category || 'ESSENTIAL');
    } else {
      setSpendFormId(null);
      setSpendFormName('');
      setSpendFormCat('ESSENTIAL');
    }
    setOpenSpendModal(true);
  };

  const handleSaveSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = { name: spendFormName, category: spendFormCat };
      if (spendFormId) {
        await api.put(`/api/v1/spending-types/${spendFormId}`, payload);
        showSnackbar('Tipo de despesa atualizado com sucesso!', 'success');
      } else {
        await api.post('/api/v1/spending-types', payload);
        showSnackbar('Tipo de despesa criado com sucesso!', 'success');
      }
      setOpenSpendModal(false);
      loadData();
    } catch (e: any) {
      console.error(e);
      showSnackbar(`Erro: ${e?.response?.data?.message || 'Falha ao salvar'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const executeDeleteSpend = async (id: string) => {
    try {
      await api.delete(`/api/v1/spending-types/${id}`);
      showSnackbar('Tipo de despesa excluído!', 'success');
      loadData();
    } catch (e: any) {
      console.error(e);
      showSnackbar(`Erro: ${e?.response?.data?.message || 'Em uso ou não encontrado'}`, 'error');
    } finally {
      setConfirmTarget(null);
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar title="Gerenciar Tipos e Categorias" showBackButton backPath="/financas" backLabel="Voltar" />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Grid container spacing={3}>
          
          {/* Tipos de Receita */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Tipos de Receita</Typography>
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => handleOpenRev()}>Novo</Button>
              </Box>
              <TableContainer sx={{ flexGrow: 1 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={2} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                    ) : revenueTypes.length === 0 ? (
                      <TableRow><TableCell colSpan={2} align="center">Nenhum tipo encontrado.</TableCell></TableRow>
                    ) : (
                      revenueTypes.map(r => (
                        <TableRow key={r.id} hover>
                          <TableCell>{r.name}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" color="primary" onClick={() => handleOpenRev(r)}><EditIcon fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => setConfirmTarget({ origin: 'rev', id: r.id })}><DeleteIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Tipos de Despesa */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Tipos de Despesa</Typography>
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => handleOpenSpend()}>Novo</Button>
              </Box>
              <TableContainer sx={{ flexGrow: 1 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Regra 50/30/20</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={3} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                    ) : spendingTypes.length === 0 ? (
                      <TableRow><TableCell colSpan={3} align="center">Nenhum tipo encontrado.</TableCell></TableRow>
                    ) : (
                      spendingTypes.map(s => (
                        <TableRow key={s.id} hover>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>
                            {s.category === 'ESSENTIAL' ? 'Essencial (50%)' :
                             s.category === 'PERSONAL' ? 'Pessoal (30%)' :
                             s.category === 'SAVINGS' ? 'Economia (20%)' : s.category}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" color="primary" onClick={() => handleOpenSpend(s)}><EditIcon fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => setConfirmTarget({ origin: 'spend', id: s.id })}><DeleteIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Modals */}
        <Dialog open={openRevModal} onClose={() => setOpenRevModal(false)}>
          <form onSubmit={handleSaveRev}>
            <DialogTitle>{revFormId ? 'Editar Tipo de Receita' : 'Novo Tipo de Receita'}</DialogTitle>
            <DialogContent dividers>
              <TextField autoFocus fullWidth label="Nome do Tipo" value={revFormName} onChange={e => setRevFormName(e.target.value)} required margin="normal" />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenRevModal(false)}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={actionLoading}>
                {actionLoading ? <CircularProgress size={24} /> : 'Salvar'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        <Dialog open={openSpendModal} onClose={() => setOpenSpendModal(false)}>
          <form onSubmit={handleSaveSpend}>
            <DialogTitle>{spendFormId ? 'Editar Tipo de Despesa' : 'Novo Tipo de Despesa'}</DialogTitle>
            <DialogContent dividers>
              <TextField autoFocus fullWidth label="Nome do Tipo" value={spendFormName} onChange={e => setSpendFormName(e.target.value)} required margin="normal" />
              <TextField fullWidth select label="Categoria da Regra 50/30/20" value={spendFormCat} onChange={e => setSpendFormCat(e.target.value)} required margin="normal">
                <MenuItem value="ESSENTIAL">Gastos Essenciais (50%)</MenuItem>
                <MenuItem value="PERSONAL">Gastos Pessoais (30%)</MenuItem>
                <MenuItem value="SAVINGS">Economia/Investimento (20%)</MenuItem>
              </TextField>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenSpendModal(false)}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={actionLoading}>
                {actionLoading ? <CircularProgress size={24} /> : 'Salvar'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
      
      <ConfirmDialog
        open={confirmTarget !== null}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este tipo? Se ele estiver em uso por algum lançamento, a operação poderá ser rejeitada pelo sistema."
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (!confirmTarget) return;
          confirmTarget.origin === 'rev' ? executeDeleteRev(confirmTarget.id) : executeDeleteSpend(confirmTarget.id);
        }}
      />
    </Box>
  );
};

export default GerenciarTipos;

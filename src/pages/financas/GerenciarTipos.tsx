import { FC, useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress,
  Grid, Typography, Chip
, Checkbox, FormControlLabel } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, History as HistoryIcon } from '@mui/icons-material';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import AppNavbar from '@/components/AppNavbar';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useSnackbar } from '@/hooks/useSnackbar';
import { RevenueTypeDTO, SpendingTypeDTO, RevenueTypeRevisionDTO, SpendingTypeRevisionDTO } from '@/interfaces/budget';
import { getErrorMessage } from '@/utils/errors';

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
  const [revFormInclude, setRevFormInclude] = useState(true);
  const [revFormMonthlyInclude, setRevFormMonthlyInclude] = useState(true);
  
  const [spendFormId, setSpendFormId] = useState<string | null>(null);
  const [spendFormName, setSpendFormName] = useState('');
  const [spendFormCat, setSpendFormCat] = useState('ESSENTIAL');
  const [spendFormInclude, setSpendFormInclude] = useState(true);
  const [spendFormMonthlyInclude, setSpendFormMonthlyInclude] = useState(true);
  
  const [confirmTarget, setConfirmTarget] = useState<{ origin: 'rev' | 'spend', id: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [auditTarget, setAuditTarget] = useState<{ origin: 'rev' | 'spend', id: string, name: string } | null>(null);
  const [revAuditHistory, setRevAuditHistory] = useState<RevenueTypeRevisionDTO[]>([]);
  const [spendAuditHistory, setSpendAuditHistory] = useState<SpendingTypeRevisionDTO[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);


  
  const handleOpenAudit = async (origin: 'rev' | 'spend', id: string, name: string) => {
    setAuditTarget({ origin, id, name });
    setIsLoadingAudit(true);
    setRevAuditHistory([]);
    setSpendAuditHistory([]);
    try {
      const endpoint = origin === 'rev' 
        ? `/api/v1/revenue-types/${id}/history`
        : `/api/v1/spending-types/${id}/history`;
      const res = await api.get(endpoint);
      if (origin === 'rev') setRevAuditHistory(res.data || []);
      else setSpendAuditHistory(res.data || []);
    } catch (e: unknown) {
      console.error(e);
      showSnackbar('Erro ao carregar histórico de auditoria', 'error');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const renderStatusChip = (context: string, isIncluded?: boolean) => {
    const isHidden = isIncluded === false;
    return (
      <Chip 
        label={isHidden ? `Oculto no ${context}` : `Exibido no ${context}`} 
        size="small" 
        sx={{ 
          ml: 1, 
          height: 20, 
          fontSize: '0.65rem',
          bgcolor: isHidden ? '#ffebee' : '#e3f2fd',
          color: isHidden ? '#c62828' : '#1565c0',
          fontWeight: 600
        }} 
      />
    );
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
      const [revRes, spendRes] = await Promise.all([
        api.get('/api/v1/revenue-types'),
        api.get('/api/v1/spending-types')
      ]);
      setRevenueTypes(Array.isArray(revRes.data) ? revRes.data : []);
      setSpendingTypes(Array.isArray(spendRes.data) ? spendRes.data : []);
    } catch (e: unknown) {
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
      setRevFormInclude(t.includeInTotals ?? true);
      setRevFormMonthlyInclude(t.includeInMonthlyTotals ?? true);
    } else {
      setRevFormId(null);
      setRevFormName('');
      setRevFormInclude(true);
      setRevFormMonthlyInclude(true);
    }
    setOpenRevModal(true);
  };

  const handleSaveRev = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = { name: revFormName, includeInTotals: revFormInclude, includeInMonthlyTotals: revFormMonthlyInclude };
      if (revFormId) {
        await api.put(`/api/v1/revenue-types/${revFormId}`, payload);
        showSnackbar('Tipo de receita atualizado com sucesso!', 'success');
      } else {
        await api.post('/api/v1/revenue-types', payload);
        showSnackbar('Tipo de receita criado com sucesso!', 'success');
      }
      setOpenRevModal(false);
      loadData();
    } catch (e: unknown) {
      console.error(e);
      showSnackbar(`Erro: ${getErrorMessage(e) || 'Falha ao salvar'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const executeDeleteRev = async (id: string) => {
    try {
      await api.delete(`/api/v1/revenue-types/${id}`);
      showSnackbar('Tipo de receita excluído!', 'success');
      loadData();
    } catch (e: unknown) {
      console.error(e);
      showSnackbar(`Erro: ${getErrorMessage(e) || 'Em uso ou não encontrado'}`, 'error');
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
      setSpendFormInclude(t.includeInTotals ?? true);
      setSpendFormMonthlyInclude(t.includeInMonthlyTotals ?? true);
    } else {
      setSpendFormId(null);
      setSpendFormName('');
      setSpendFormCat('ESSENTIAL');
      setSpendFormInclude(true);
      setSpendFormMonthlyInclude(true);
    }
    setOpenSpendModal(true);
  };

  const handleSaveSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = { name: spendFormName, category: spendFormCat, includeInTotals: spendFormInclude, includeInMonthlyTotals: spendFormMonthlyInclude };
      if (spendFormId) {
        await api.put(`/api/v1/spending-types/${spendFormId}`, payload);
        showSnackbar('Tipo de despesa atualizado com sucesso!', 'success');
      } else {
        await api.post('/api/v1/spending-types', payload);
        showSnackbar('Tipo de despesa criado com sucesso!', 'success');
      }
      setOpenSpendModal(false);
      loadData();
    } catch (e: unknown) {
      console.error(e);
      showSnackbar(`Erro: ${getErrorMessage(e) || 'Falha ao salvar'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const executeDeleteSpend = async (id: string) => {
    try {
      await api.delete(`/api/v1/spending-types/${id}`);
      showSnackbar('Tipo de despesa excluído!', 'success');
      loadData();
    } catch (e: unknown) {
      console.error(e);
      showSnackbar(`Erro: ${getErrorMessage(e) || 'Em uso ou não encontrado'}`, 'error');
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
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ mr: 1 }}>{r.name}</Typography>
                              {renderStatusChip('Anual', r.includeInTotals)}
                              {renderStatusChip('Mensal', r.includeInMonthlyTotals)}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" color="info" onClick={() => handleOpenAudit('rev', r.id, r.name)} title="Ver Histórico"><HistoryIcon fontSize="small" /></IconButton>
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
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ mr: 1 }}>{s.name}</Typography>
                              {renderStatusChip('Anual', s.includeInTotals)}
                              {renderStatusChip('Mensal', s.includeInMonthlyTotals)}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {s.category === 'ESSENTIAL' ? 'Essencial (50%)' :
                             s.category === 'PERSONAL' ? 'Pessoal (30%)' :
                             s.category === 'SAVINGS' ? 'Economia (20%)' : s.category}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" color="info" onClick={() => handleOpenAudit('spend', s.id, s.name)} title="Ver Histórico"><HistoryIcon fontSize="small" /></IconButton>
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
              <FormControlLabel control={<Checkbox checked={revFormInclude} onChange={e => setRevFormInclude(e.target.checked)} />} label="Incluir na contagem anual" sx={{ mt: 1 }} />
              <FormControlLabel control={<Checkbox checked={revFormMonthlyInclude} onChange={e => setRevFormMonthlyInclude(e.target.checked)} />} label="Incluir na contagem mensal" sx={{ mt: 1 }} />
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
              <FormControlLabel control={<Checkbox checked={spendFormInclude} onChange={e => setSpendFormInclude(e.target.checked)} />} label="Incluir na contagem anual" sx={{ mt: 1 }} />
              <FormControlLabel control={<Checkbox checked={spendFormMonthlyInclude} onChange={e => setSpendFormMonthlyInclude(e.target.checked)} />} label="Incluir na contagem mensal" sx={{ mt: 1 }} />
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
      
      
      <Dialog open={Boolean(auditTarget)} onClose={() => setAuditTarget(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" /> Histórico de Auditoria: {auditTarget?.name}
        </DialogTitle>
        <DialogContent dividers>
          {isLoadingAudit ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
          ) : (auditTarget?.origin === 'rev' ? revAuditHistory : spendAuditHistory).length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              Nenhum registro de auditoria encontrado para este tipo.
            </Typography>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Rev. #</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Operação</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Data/Hora (Modificação)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Autor</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Nome Salvo</TableCell>
                    {auditTarget?.origin === 'spend' && <TableCell sx={{ fontWeight: 600 }}>Regra</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(auditTarget?.origin === 'rev' ? revAuditHistory : spendAuditHistory).map((rev: RevenueTypeRevisionDTO & SpendingTypeRevisionDTO) => (
                    <TableRow key={rev.revision} hover>
                      <TableCell sx={{ fontWeight: 600 }}>#{rev.revision}</TableCell>
                      <TableCell>{getRevisionTypeChip(rev.revisionType)}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {rev.changedAt ? new Date(rev.changedAt).toLocaleString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{rev.changedBy || 'Sistema'}</TableCell>
                      <TableCell>{rev.name || '-'}</TableCell>
                      {auditTarget?.origin === 'spend' && (
                        <TableCell>
                          {rev.category === 'ESSENTIAL' ? 'Essencial (50%)' :
                           rev.category === 'PERSONAL' ? 'Pessoal (30%)' :
                           rev.category === 'SAVINGS' ? 'Economia (20%)' : rev.category || '-'}
                        </TableCell>
                      )}
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

      <ConfirmDialog
        open={confirmTarget !== null}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este tipo? Se ele estiver em uso por algum lançamento, a operação poderá ser rejeitada pelo sistema."
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (!confirmTarget) return;
          if (confirmTarget.origin === 'rev') { executeDeleteRev(confirmTarget.id); } else { executeDeleteSpend(confirmTarget.id); }
        }}
      />
    </Box>
  );
};

export default GerenciarTipos;

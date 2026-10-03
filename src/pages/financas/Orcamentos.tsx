import { FC, useState, useEffect, useCallback } from 'react';
import { Box, Container, Button, Paper, Typography, Grid, CircularProgress, TextField, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab } from '@mui/material';
import { Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import axios from 'axios';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { loadOrcamentos, OrcamentosData } from '@/services/budgetApi';
import { useSnackbar } from '@/hooks/useSnackbar';
import AppNavbar from '@/components/AppNavbar';
import { formatCurrency } from '@/utils/format';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

/** Gráficos de pizza da visão mensal ocultos a pedido (commit "oculta gráficos de pizza"); mude para reexibir. */
const SHOW_MONTHLY_PIE_CHARTS = false;

const Orcamentos: FC = () => {
  const api = useAxiosWithAuth();
  const { showSnackbar } = useSnackbar();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [appliedMonth, setAppliedMonth] = useState(today.getMonth() + 1);
  const [appliedYear, setAppliedYear] = useState(today.getFullYear());
  const [tabValue, setTabValue] = useState(0);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OrcamentosData | null>(null);

  const loadData = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      try {
        setData(await loadOrcamentos(api, { month: appliedMonth, year: appliedYear }, signal));
      } catch (e) {
        if (axios.isCancel(e)) return;
        showSnackbar('Não foi possível carregar os dados de orçamento.', 'error');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [api, appliedMonth, appliedYear, showSnackbar],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const revTotal = data?.revTotal ?? 0;
  const spendTotal = data?.spendTotal ?? 0;
  const ruleData = data?.rule ?? null;
  const summary = data?.summary ?? null;
  const yearlySummary = data?.yearly ?? null;
  const revenuesByType = data?.revenuesByType ?? [];
  const spendingsByType = data?.spendingsByType ?? [];
  const yearlyChartData = data?.yearlyChart ?? [];
  const monthlyRevsByType = data?.monthlyRevenuesByType ?? [];
  const monthlySpendsByType = data?.monthlySpendingsByType ?? [];

  const revSpendPieData = [
    { name: 'Receitas', value: revTotal, fill: '#4caf50' },
    { name: 'Despesas', value: spendTotal, fill: '#f44336' }
  ].filter(d => d.value > 0);

  const pieData = ruleData ? [
    { name: 'Essencial', value: ruleData.essential.actual },
    { name: 'Pessoal', value: ruleData.personal.actual },
    { name: 'Economia', value: ruleData.savings.actual }
  ].filter(b => b.value > 0) : [];

  const buckets = ruleData ? [
    { label: 'Gastos Essenciais (50%)', data: ruleData.essential, type: 'expense' },
    { label: 'Gastos Pessoais (30%)', data: ruleData.personal, type: 'expense' },
    { label: 'Economia/Investimentos (20%)', data: ruleData.savings, type: 'savings' }
  ] : [];

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar title="Metas e Orçamentos" showBackButton backPath="/financas" backLabel="Voltar" />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} variant="fullWidth" centered>
            <Tab label="Visão Mensal" />
            <Tab label="Visão Anual" />
            <Tab label="Visão Gráfica" />
          </Tabs>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
        ) : (
          <>
            <Box sx={{ display: tabValue === 0 ? 'block' : 'none' }}>
              <Paper elevation={1} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'flex-end' }}>
                <Typography variant="subtitle2" color="text.secondary">Filtro Mensal:</Typography>
                <TextField select label="Mês" value={month} onChange={e => setMonth(Number(e.target.value))} size="small" sx={{ minWidth: 100 }}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <MenuItem key={m} value={m}>{m.toString().padStart(2, '0')}</MenuItem>
                  ))}
                </TextField>
                <TextField type="number" label="Ano" value={year} onChange={e => setYear(Number(e.target.value))} size="small" sx={{ width: 100 }} />
                <Button variant="contained" onClick={() => { setAppliedMonth(month); setAppliedYear(year); }}>Filtrar</Button>
              </Paper>
              <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Resumo Geral do Mês</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                      <Typography variant="subtitle2">Total de Receitas</Typography>
                      <Typography variant="h6">{formatCurrency(summary?.totalRevenue)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                      <Typography variant="subtitle2">Total de Despesas</Typography>
                      <Typography variant="h6">{formatCurrency(summary?.totalSpending)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2">Total Pago</Typography>
                      <Typography variant="h6">{formatCurrency(summary?.totalPaid)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2">Falta Pagar</Typography>
                      <Typography variant="h6" color="warning.main">{formatCurrency(summary?.totalPending)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={12} md={2.4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: (summary?.projectedBalance || 0) >= 0 ? 'info.light' : 'warning.light' }}>
                      <Typography variant="subtitle2">Previsão Saldo Final</Typography>
                      <Typography variant="h6">{formatCurrency(summary?.projectedBalance)}</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            {/* GRÁFICOS OCULTOS CONFORME SOLICITADO */}
            {SHOW_MONTHLY_PIE_CHARTS && (<>
<Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" align="center" gutterBottom>Receitas vs Despesas</Typography>
                <Box sx={{ height: 350, width: "100%", mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={revSpendPieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} (${(Number(percent || 0) * 100).toFixed(0)}%)`}>
                        {revSpendPieData.map((entry, index) => (
                          <Cell key={`cell-rs-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: unknown) => formatCurrency(value as number)} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>

                <TableContainer sx={{ mt: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Categoria</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Valor (R$)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow hover>
                        <TableCell>Receitas</TableCell>
                        <TableCell align="right">{Number(revTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      </TableRow>
                      <TableRow hover>
                        <TableCell>Despesas</TableCell>
                        <TableCell align="right">{Number(spendTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" align="center" gutterBottom>Gastos por Meta (50/30/20)</Typography>
                <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} (${(Number(percent || 0) * 100).toFixed(0)}%)`}>
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: unknown) => formatCurrency(value as number)} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
</>)}

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" align="center" gutterBottom>Receitas por Tipo (Mês atual)</Typography>
                <TableContainer sx={{ mt: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Tipo de Receita</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Valor Arrecadado (R$)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {monthlyRevsByType.filter(r => Number(r.total) > 0).length === 0 ? (
                        <TableRow><TableCell colSpan={2} align="center">Nenhum dado.</TableCell></TableRow>
                      ) : monthlyRevsByType.filter(r => Number(r.total) > 0).map(r => (
                        <TableRow key={r.typeId} hover>
                          <TableCell>{r.typeName}</TableCell>
                          <TableCell align="right">{formatCurrency(r.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" align="center" gutterBottom>Despesas por Tipo (Mês atual)</Typography>
                <TableContainer sx={{ mt: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Tipo de Despesa</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Valor Gasto (R$)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {monthlySpendsByType.filter(s => Number(s.total) > 0).length === 0 ? (
                        <TableRow><TableCell colSpan={2} align="center">Nenhum dado.</TableCell></TableRow>
                      ) : monthlySpendsByType.filter(s => Number(s.total) > 0).map(s => (
                        <TableRow key={s.typeId} hover>
                          <TableCell>{s.typeName}</TableCell>
                          <TableCell align="right">{formatCurrency(s.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            
            
            <Grid item xs={12}>

              <Paper sx={{ p: 3 }}>

                <Typography variant="h6" gutterBottom>Status das Metas (Orçamento)</Typography>
                <Grid container spacing={2}>
                  {buckets.map(b => (
                    <Grid item xs={12} md={4} key={b.label}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="subtitle1" color="primary">{b.label}</Typography>
                        <Typography variant="body2">Meta: {Number(b.data.target).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Typography>
                        <Typography variant="body2">
                          {b.type === 'savings' ? 'Investido/Poupado' : 'Gasto'}: {Number(b.data.actual).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </Typography>
                        <Typography variant="body2" color={
                          b.type === 'expense' 
                            ? (b.data.actual > b.data.target ? 'error' : 'success.main') 
                            : (b.data.actual < b.data.target ? 'error' : 'success.main')
                        } sx={{ fontWeight: 'bold', mt: 1, minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {b.type === 'savings' 
                            ? (b.data.actual < b.data.target 
                                ? `Investiu/Poupou ${Number(Math.abs(b.data.difference)).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})} abaixo da meta.`
                                : (b.data.actual > b.data.target 
                                    ? `Investiu/Poupou ${Number(Math.abs(b.data.difference)).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})} acima da meta.` 
                                    : 'Atingiu a meta exatamente.'))
                            : (b.data.actual < b.data.target 
                                ? `Gastou ${Number(Math.abs(b.data.difference)).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})} abaixo da meta de gastos.`
                                : (b.data.actual > b.data.target 
                                    ? `Gastou ${Number(Math.abs(b.data.difference)).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})} acima da meta de gastos.` 
                                    : 'Atingiu a meta de gastos exatamente.'))
                          }
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

            </Grid>

            </Grid>
            </Box>
            <Box sx={{ display: tabValue === 1 ? 'block' : 'none' }}>
              <Paper elevation={1} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'flex-end' }}>
                <Typography variant="subtitle2" color="text.secondary">Filtro Anual:</Typography>
                <TextField type="number" label="Ano" value={year} onChange={e => setYear(Number(e.target.value))} size="small" sx={{ width: 100 }} />
                <Button variant="contained" onClick={() => { setAppliedYear(year); setAppliedMonth(month); }}>Filtrar</Button>
              </Paper>
              <Grid container spacing={3}>
            

            <Grid item xs={12}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Resumo Geral do Ano</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                      <Typography variant="subtitle2">Total de Receitas (Ano)</Typography>
                      <Typography variant="h6">{formatCurrency(yearlySummary?.totalRevenue)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                      <Typography variant="subtitle2">Total de Despesas (Ano)</Typography>
                      <Typography variant="h6">{formatCurrency(yearlySummary?.totalSpending)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: (yearlySummary?.balance || 0) >= 0 ? 'info.light' : 'warning.light' }}>
                      <Typography variant="subtitle2">Saldo (Ano)</Typography>
                      <Typography variant="h6">{formatCurrency(yearlySummary?.balance)}</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" align="center" gutterBottom>Receitas por Tipo ({year})</Typography>
                <TableContainer sx={{ mt: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Tipo de Receita</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Valor Arrecadado (R$)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {revenuesByType.filter(r => Number(r.total) > 0).length === 0 ? (
                        <TableRow><TableCell colSpan={2} align="center">Nenhum dado.</TableCell></TableRow>
                      ) : revenuesByType.filter(r => Number(r.total) > 0).map(r => (
                        <TableRow key={r.typeId} hover>
                          <TableCell>{r.typeName}</TableCell>
                          <TableCell align="right">{Number(r.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" align="center" gutterBottom>Despesas por Tipo ({year})</Typography>
                <TableContainer sx={{ mt: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Tipo de Despesa</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Valor Gasto (R$)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {spendingsByType.filter(s => Number(s.total) > 0).length === 0 ? (
                        <TableRow><TableCell colSpan={2} align="center">Nenhum dado.</TableCell></TableRow>
                      ) : spendingsByType.filter(s => Number(s.total) > 0).map(s => (
                        <TableRow key={s.typeId} hover>
                          <TableCell>{s.typeName}</TableCell>
                          <TableCell align="right">{Number(s.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

              </Paper>
            </Grid>
                        </Grid>
            </Box>
          
            <Box sx={{ display: tabValue === 2 ? 'block' : 'none' }}>
              <Paper elevation={1} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'flex-end' }}>
                <Typography variant="subtitle2" color="text.secondary">Filtro do Gráfico:</Typography>
                <TextField type="number" label="Ano" value={year} onChange={e => setYear(Number(e.target.value))} size="small" sx={{ width: 100 }} />
                <Button variant="contained" onClick={() => { setAppliedYear(year); setAppliedMonth(month); }}>Filtrar</Button>
              </Paper>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" align="center" gutterBottom>Despesas vs Receitas ({appliedYear})</Typography>
                    <Box sx={{ flexGrow: 1, minHeight: 0, mt: 2 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yearlyChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="monthName" />
                          <YAxis tickFormatter={(val) => `R$ ${val}`} />
                          <RechartsTooltip formatter={(value: unknown) => formatCurrency(value as number)} />
                          <Legend />
                          <Line type="monotone" dataKey="receitas" name="Receitas (Salário)" stroke="#82ca9d" strokeWidth={2} activeDot={{ r: 8 }} />
                          <Line type="monotone" dataKey="despesas" name="Despesas" stroke="#ff7300" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" align="center" gutterBottom>Regra 50/30/20 - Gastos por Categoria ({appliedYear})</Typography>
                    <Box sx={{ flexGrow: 1, minHeight: 0, mt: 2 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yearlyChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="monthName" />
                          <YAxis tickFormatter={(val) => `R$ ${val}`} />
                          <RechartsTooltip formatter={(value: unknown) => formatCurrency(value as number)} />
                          <Legend />
                          <Line type="monotone" dataKey="essenciais" name="Essenciais (50%)" stroke="#0088FE" strokeWidth={2} />
                          <Line type="monotone" dataKey="pessoais" name="Pessoais (30%)" stroke="#00C49F" strokeWidth={2} />
                          <Line type="monotone" dataKey="poupanca" name="Poupança (20%)" stroke="#FFBB28" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
};
export default Orcamentos;

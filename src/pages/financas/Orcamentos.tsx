import { FC, useState, useEffect, useCallback } from 'react';
import { Box, Container, Paper, Typography, Grid, CircularProgress, TextField, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import AppNavbar from '@/components/AppNavbar';
import { TotalDTO, FiftyThirtyTwentyDTO, MonthlySummaryDTO, YearlySummaryDTO, TypeTotalDTO } from '@/interfaces/budget';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

const Orcamentos: FC = () => {
  const api = useAxiosWithAuth();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  
  const [loading, setLoading] = useState(false);
  const [revTotal, setRevTotal] = useState(0);
  const [spendTotal, setSpendTotal] = useState(0);
  const [ruleData, setRuleData] = useState<FiftyThirtyTwentyDTO | null>(null);
  
  const [summary, setSummary] = useState<MonthlySummaryDTO | null>(null);
  const [yearlySummary, setYearlySummary] = useState<YearlySummaryDTO | null>(null);
  const [revenuesByType, setRevenuesByType] = useState<TypeTotalDTO[]>([]);
  const [spendingsByType, setSpendingsByType] = useState<TypeTotalDTO[]>([]);


  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      
      const p = { month, year };
      const pYear = { year };
      const [revRes, spendRes, ruleRes, summaryRes, yearlyRes, revByTypeRes, spendByTypeRes] = await Promise.all([
        api.get<TotalDTO>('/api/v1/revenues/total', { params: p }),
        api.get<TotalDTO>('/api/v1/spendings/total', { params: p }),
        api.get<FiftyThirtyTwentyDTO>('/api/v1/budget-rules/fifty-thirty-twenty', { params: p }),
        api.get<MonthlySummaryDTO>('/api/v1/budget-rules/monthly-summary', { params: p }),
        api.get<YearlySummaryDTO>('/api/v1/budget-rules/yearly-summary', { params: pYear }),
        api.get<TypeTotalDTO[]>('/api/v1/revenues/by-type', { params: pYear }),
        api.get<TypeTotalDTO[]>('/api/v1/spendings/by-type', { params: pYear })
      ]);
      setRevTotal(revRes.data.total || 0);
      setSpendTotal(spendRes.data.total || 0);
      setRuleData(ruleRes.data);
      setSummary(summaryRes.data);
      setYearlySummary(yearlyRes.data);
      setRevenuesByType(revByTypeRes.data || []);
      setSpendingsByType(spendByTypeRes.data || []);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api, month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    { label: 'Gastos Essenciais (50%)', data: ruleData.essential },
    { label: 'Gastos Pessoais (30%)', data: ruleData.personal },
    { label: 'Economia/Investimentos (20%)', data: ruleData.savings }
  ] : [];

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar title="Metas e Orçamentos" showBackButton backPath="/financas" backLabel="Voltar" />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="subtitle1">Filtro:</Typography>
          <TextField select label="Mês" value={month} onChange={e => setMonth(Number(e.target.value))} size="small">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <MenuItem key={m} value={m}>{m.toString().padStart(2, '0')}</MenuItem>
            ))}
          </TextField>
          <TextField type="number" label="Ano" value={year} onChange={e => setYear(Number(e.target.value))} size="small" />
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" align="center" gutterBottom>Receitas vs Despesas</Typography>
                <Box sx={{ height: 350, width: "100%", mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={revSpendPieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }: any) => `${name} (${(Number(percent || 0) * 100).toFixed(0)}%)`}>
                        {revSpendPieData.map((entry, index) => (
                          <Cell key={`cell-rs-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => `R$ ${Number(value || 0).toFixed(2)}`} />
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
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, percent }: any) => `${name} (${(Number(percent || 0) * 100).toFixed(0)}%)`}>
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => `R$ ${Number(value || 0).toFixed(2)}`} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            
            <Grid item xs={12}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Resumo Geral do Mês</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                      <Typography variant="subtitle2">Total de Receitas</Typography>
                      <Typography variant="h6">R$ {summary?.totalRevenue.toFixed(2) || '0.00'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                      <Typography variant="subtitle2">Total de Despesas</Typography>
                      <Typography variant="h6">R$ {summary?.totalSpending.toFixed(2) || '0.00'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2">Total Pago</Typography>
                      <Typography variant="h6">R$ {summary?.totalPaid.toFixed(2) || '0.00'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2">Falta Pagar</Typography>
                      <Typography variant="h6" color="warning.main">R$ {summary?.totalPending.toFixed(2) || '0.00'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={12} md={2.4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: (summary?.projectedBalance || 0) >= 0 ? 'info.light' : 'warning.light' }}>
                      <Typography variant="subtitle2">Previsão Saldo Final</Typography>
                      <Typography variant="h6">R$ {summary?.projectedBalance.toFixed(2) || '0.00'}</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>

              <Paper sx={{ p: 3 }}>

                <Typography variant="h6" gutterBottom>Status das Metas (Orçamento)</Typography>
                <Grid container spacing={2}>
                  {buckets.map(b => (
                    <Grid item xs={12} md={4} key={b.label}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="subtitle1" color="primary">{b.label}</Typography>
                        <Typography variant="body2">Teto: R$ {b.data.target.toFixed(2)}</Typography>
                        <Typography variant="body2">Gasto: R$ {b.data.actual.toFixed(2)}</Typography>
                        <Typography variant="body2" color={b.data.difference < 0 ? 'error' : 'success.main'} sx={{ fontWeight: 'bold', mt: 1 }}>
                          Restante: R$ {b.data.difference.toFixed(2)}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

            </Grid>

            {/* SEÇÃO ANUAL */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="h5" gutterBottom color="primary.main" sx={{ fontWeight: 'bold' }}>
                Visão Anual ({year})
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Resumo Geral do Ano</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                      <Typography variant="subtitle2">Total de Receitas (Ano)</Typography>
                      <Typography variant="h6">R$ {yearlySummary?.totalRevenue.toFixed(2) || '0.00'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                      <Typography variant="subtitle2">Total de Despesas (Ano)</Typography>
                      <Typography variant="h6">R$ {yearlySummary?.totalSpending.toFixed(2) || '0.00'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: (yearlySummary?.balance || 0) >= 0 ? 'info.light' : 'warning.light' }}>
                      <Typography variant="subtitle2">Saldo (Ano)</Typography>
                      <Typography variant="h6">R$ {yearlySummary?.balance.toFixed(2) || '0.00'}</Typography>
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
                      {revenuesByType.length === 0 ? (
                        <TableRow><TableCell colSpan={2} align="center">Nenhum dado.</TableCell></TableRow>
                      ) : revenuesByType.map(r => (
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
                      {spendingsByType.length === 0 ? (
                        <TableRow><TableCell colSpan={2} align="center">Nenhum dado.</TableCell></TableRow>
                      ) : spendingsByType.map(s => (
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
        )}
      </Container>
    </Box>
  );
};
export default Orcamentos;

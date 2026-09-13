import { FC, useState, useEffect, useCallback } from 'react';
import { Box, Container, Paper, Typography, Grid, CircularProgress, TextField, MenuItem } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '@/services/api';
import AppNavbar from '@/components/AppNavbar';
import { TotalDTO, BudgetBucketDTO } from '@/interfaces/budget';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Orcamentos: FC = () => {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  
  const [loading, setLoading] = useState(false);
  const [revTotal, setRevTotal] = useState(0);
  const [spendTotal, setSpendTotal] = useState(0);
  const [buckets, setBuckets] = useState<BudgetBucketDTO[]>([]);

  const loadData = useCallback(async () => {
    
    setLoading(true);
    try {
      const p = { month, year };
      const [revRes, spendRes, ruleRes] = await Promise.all([
        api.get<TotalDTO>('/api/v1/revenues/total', { params: p }),
        api.get<TotalDTO>('/api/v1/spendings/total', { params: p }),
        api.get<BudgetBucketDTO[]>('/api/v1/budget-rules/fifty-thirty-twenty', { params: p })
      ]);
      setRevTotal(revRes.data.total || 0);
      setSpendTotal(spendRes.data.total || 0);
      setBuckets(ruleRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  

  const barData = [
    { name: 'Geral', Receitas: revTotal, Despesas: spendTotal }
  ];

  const pieData = buckets.map(b => ({
    name: b.category,
    value: b.currentSpending
  })).filter(b => b.value > 0);

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
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" align="center" gutterBottom>Receitas vs Despesas</Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="Receitas" fill="#4caf50" />
                  <Bar dataKey="Despesas" fill="#f44336" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" align="center" gutterBottom>Gastos por Meta (50/30/20)</Typography>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label>
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Status das Metas (Orçamento)</Typography>
              <Grid container spacing={2}>
                {buckets.map(b => (
                  <Grid item xs={12} md={4} key={b.category}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle1" color="primary">{b.category}</Typography>
                      <Typography variant="body2">Teto: R$ {b.targetSpending.toFixed(2)}</Typography>
                      <Typography variant="body2">Gasto: R$ {b.currentSpending.toFixed(2)}</Typography>
                      <Typography variant="body2" color={b.remaining < 0 ? 'error' : 'success.main'}>
                        Restante: R$ {b.remaining.toFixed(2)}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
    </Box>
  );
};
export default Orcamentos;

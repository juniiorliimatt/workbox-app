import { FC } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { History as HistoryIcon } from '@mui/icons-material';
import { formatCurrency } from '@/utils/format';
import { LancamentoRevision } from './useLancamentos';

/** Chip colorido do tipo de revisão do Envers (ADD / MOD / DEL). */
export const RevisionTypeChip: FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'ADD': return <Chip label="Criação (ADD)" color="success" size="small" />;
    case 'MOD': return <Chip label="Alteração (MOD)" color="primary" size="small" />;
    case 'DEL': return <Chip label="Exclusão (DEL)" color="error" size="small" />;
    default: return <Chip label={type} size="small" />;
  }
};

interface Props {
  /** Lançamento cujo histórico está aberto; nulo = diálogo fechado. */
  target: { id: string } | null;
  loading: boolean;
  history: LancamentoRevision[];
  onClose: () => void;
}

/** Histórico de auditoria de um lançamento (receita ou despesa): uma linha por revisão. */
const AuditHistoryDialog: FC<Props> = ({ target, loading, history, onClose }) => (
  <Dialog open={Boolean(target)} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
      <HistoryIcon color="primary" /> Histórico de Auditoria: {target?.id}
    </DialogTitle>
    <DialogContent dividers>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : history.length === 0 ? (
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
              {history.map((rev) => (
                <TableRow key={rev.revision} hover>
                  <TableCell sx={{ fontWeight: 600 }}>#{rev.revision}</TableCell>
                  <TableCell><RevisionTypeChip type={rev.revisionType} /></TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {rev.changedAt ? new Date(rev.changedAt).toLocaleString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{rev.changedBy || 'Sistema'}</TableCell>
                  <TableCell>{rev.value !== undefined ? formatCurrency(rev.value) : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onClose}>Fechar</Button>
    </DialogActions>
  </Dialog>
);

export default AuditHistoryDialog;

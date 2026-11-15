import { FC, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import useLazyTabData from '@/hooks/useLazyTabData';
import { useSnackbar } from '@/hooks/useSnackbar';
import { IRefuelingPage } from '@/interfaces/moto';
import { RecordCard, RecordList } from '@/pages/moto/RecordList';
import { useCompactLayout } from '@/pages/moto/useCompactLayout';
import { OPEN_CONSUMPTION, formatDate, formatKm, formatKmPerLiter, formatLitersWithTank } from '@/pages/moto/format';
import { listRefuelings } from '@/services/motoApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';

export interface TrechosTableProps {
  motoId: string;
  /** Só busca com a aba visível. */
  active: boolean;
  /** Muda quando outra aba gravou algo: recarrega. */
  refreshKey: number;
}

const TITLE = 'Entre abastecimentos';
const PAGE_SIZE = 10;

/**
 * Km rodados com o combustível de cada abastecimento e o km/l dele (km ÷ os litros da própria linha), do mais recente ao
 * mais antigo. Vêm do servidor, calculados sobre a moto inteira; o mais recente fica "Em aberto" até o próximo.
 */
const TrechosTable: FC<TrechosTableProps> = ({ motoId, active, refreshKey }) => {
  const api = useAxiosWithAuth();
  const { showSnackbar } = useSnackbar();
  const compact = useCompactLayout();
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);

  const { data, error } = useLazyTabData<IRefuelingPage>(
    active,
    `${motoId}|${page}|${refreshKey}|${retry}`,
    (signal) => listRefuelings(api, motoId, { page, size: PAGE_SIZE }, signal),
    () => showSnackbar('Erro ao carregar os abastecimentos', 'error'),
  );
  const items = data?.content ?? [];

  return (
    <Paper variant="outlined" component="section" aria-labelledby="trechos-title" sx={{ p: 2, mb: 4 }}>
      <Typography id="trechos-title" variant="h6" component="h2" sx={{ mb: 1 }}>
        {TITLE}
      </Typography>

      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => setRetry((n) => n + 1)} aria-label="Tentar carregar os abastecimentos de novo">
              Tentar novamente
            </Button>
          }
        >
          Não foi possível carregar os abastecimentos.
        </Alert>
      )}

      {!error && data === null && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} aria-label="Carregando abastecimentos" />
        </Box>
      )}

      {!error && data !== null && items.length === 0 && <Typography color="text.secondary">Nenhum abastecimento registrado.</Typography>}

      {!error && data !== null && items.length > 0 && (
        <>
          {compact ? (
            <RecordList label={TITLE}>
              {items.map((item) => (
                <RecordCard
                  key={item.id}
                  title={`${formatDate(item.date)} · ${formatKm(item.odometerKm)}`}
                  lines={[
                    item.kmDriven === null
                      ? `${formatLitersWithTank(item.liters, item.litersInTank)} · consumo em aberto até o próximo abastecimento`
                      : `${formatKm(item.kmDriven)} rodados com ${formatLitersWithTank(item.liters, item.litersInTank)} · ${formatKmPerLiter(item.kmPerLiter)}`,
                  ]}
                  actions={null}
                />
              ))}
            </RecordList>
          ) : (
            <TableContainer>
              <Table size="small" aria-label={TITLE}>
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell align="right">Hodômetro</TableCell>
                    <TableCell align="right">Km rodados</TableCell>
                    <TableCell align="right">Litros</TableCell>
                    <TableCell align="right">Consumo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{formatDate(item.date)}</TableCell>
                      <TableCell align="right">{formatKm(item.odometerKm)}</TableCell>
                      <TableCell align="right">{item.kmDriven === null ? OPEN_CONSUMPTION : formatKm(item.kmDriven)}</TableCell>
                      <TableCell align="right">{formatLitersWithTank(item.liters, item.litersInTank)}</TableCell>
                      <TableCell align="right">{item.kmDriven === null ? OPEN_CONSUMPTION : formatKmPerLiter(item.kmPerLiter)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <TablePagination
            component="div"
            count={data.page.totalElements}
            page={page}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onPageChange={(_event, next) => setPage(next)}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            getItemAriaLabel={(type) =>
              ({ first: 'Primeira página', previous: 'Página anterior', next: 'Próxima página', last: 'Última página' })[type]
            }
          />
        </>
      )}
    </Paper>
  );
};

export default TrechosTable;

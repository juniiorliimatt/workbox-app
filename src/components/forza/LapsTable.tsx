import { FC } from 'react';
import { Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { LapDTO } from '@/interfaces/forza';
import { formatLapTime, formatNumber } from '@/utils/forza';

export interface ILapsTableProps {
  laps: LapDTO[];
}

const LapsTable: FC<ILapsTableProps> = ({ laps }) => {
  if (laps.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography color="text.secondary">Nenhuma volta concluída nesta sessão.</Typography>
      </Paper>
    );
  }

  const best = Math.min(...laps.map((lap) => lap.lapTimeS));

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small" aria-label="Voltas">
        <TableHead>
          <TableRow>
            <TableCell>Volta</TableCell>
            <TableCell>Tempo</TableCell>
            <TableCell align="right">Diferença</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {laps.map((lap) => {
            const isBest = lap.lapTimeS === best;
            return (
              <TableRow key={lap.lapNumber} selected={isBest}>
                <TableCell>{lap.lapNumber}</TableCell>
                <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatLapTime(lap.lapTimeS)}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {isBest ? '—' : `+${formatNumber(lap.lapTimeS - best, 3)} s`}
                </TableCell>
                <TableCell>{isBest && <Chip label="Melhor volta" size="small" color="success" />}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default LapsTable;

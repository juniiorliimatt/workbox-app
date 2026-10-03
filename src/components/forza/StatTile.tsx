import { FC, ReactNode } from 'react';
import { Paper, Typography } from '@mui/material';

export interface IStatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}

/** Métrica única: rótulo pequeno, valor em destaque e dica opcional. */
const StatTile: FC<IStatTileProps> = ({ label, value, hint }) => (
  <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
    <Typography variant="caption" color="text.secondary" component="p">
      {label}
    </Typography>
    <Typography variant="h6" component="p" sx={{ fontWeight: 600 }}>
      {value}
    </Typography>
    {hint && (
      <Typography variant="caption" color="text.secondary" component="p">
        {hint}
      </Typography>
    )}
  </Paper>
);

export default StatTile;

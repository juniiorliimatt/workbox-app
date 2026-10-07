import { FC, ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';

/** Lista de cartões que substitui a tabela em telas pequenas (ver `useCompactLayout`). */
export interface RecordListProps {
  /** Nome acessível da lista (o mesmo que a tabela teria). */
  label: string;
  children: ReactNode;
}

export const RecordList: FC<RecordListProps> = ({ label, children }) => (
  <Box component="ul" aria-label={label} sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 1 }}>
    {children}
  </Box>
);

export interface RecordCardProps {
  /** Linha principal (em destaque). */
  title: string;
  /** Selo ao lado do título (ex.: "Tanque cheio"). */
  badge?: ReactNode;
  /** Linhas de apoio, uma por item. */
  lines: ReactNode[];
  /** Botões de ação (editar, excluir). */
  actions: ReactNode;
}

export const RecordCard: FC<RecordCardProps> = ({ title, badge, lines, actions }) => (
  <Paper component="li" variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" component="p" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {badge}
      </Box>
      {lines.map((line, index) => (
        <Typography key={index} variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
          {line}
        </Typography>
      ))}
    </Box>
    <Box sx={{ display: 'flex', flexShrink: 0, alignItems: 'flex-start' }}>{actions}</Box>
  </Paper>
);

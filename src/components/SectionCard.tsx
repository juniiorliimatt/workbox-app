import { FC, ReactNode } from 'react';
import { Box, Card, CardActionArea, CardContent, Divider, Typography } from '@mui/material';

export interface ISectionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}

/** Card de seção dos hubs de módulo (Finanças, Forza): ícone, título, descrição e navegação. */
const SectionCard: FC<ISectionCardProps> = ({ title, description, icon, onClick }) => (
  <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
    <CardActionArea sx={{ height: '100%' }} onClick={onClick}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ mr: 1, display: 'flex' }}>{icon}</Box>
          <Typography variant="h6">{title}</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </CardActionArea>
  </Card>
);

export default SectionCard;

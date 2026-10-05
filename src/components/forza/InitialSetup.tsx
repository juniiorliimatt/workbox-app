import { FC } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { ExpandMore as ExpandIcon } from '@mui/icons-material';
import { TuningSetupGroupDTO } from '@/interfaces/forza';

/** Tabela da configuração inicial: um cabeçalho por grupo (guia) e uma linha por parâmetro, valor por eixo ou único. */
const SetupTable: FC<{ groups: TuningSetupGroupDTO[] }> = ({ groups }) => (
  <TableContainer>
    <Table size="small" aria-label="Configuração inicial">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 600 }}>Parâmetro</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>Dianteira</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>Traseira</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>Observação</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {groups.map((group) => [
          <TableRow key={`${group.id}-title`}>
            <TableCell component="th" scope="colgroup" colSpan={4} sx={{ bgcolor: 'grey.100', fontWeight: 700 }}>
              {group.title}
            </TableCell>
          </TableRow>,
          ...group.items.map((item) => (
            <TableRow key={`${group.id}-${item.parameter}`}>
              <TableCell sx={{ fontWeight: 500 }}>{item.parameter}</TableCell>
              {item.value ? (
                <TableCell colSpan={2}>{item.value}</TableCell>
              ) : (
                <>
                  <TableCell>{item.front ?? '—'}</TableCell>
                  <TableCell>{item.rear ?? '—'}</TableCell>
                </>
              )}
              <TableCell sx={{ color: 'text.secondary' }}>{item.note ?? ''}</TableCell>
            </TableRow>
          )),
        ])}
      </TableBody>
    </Table>
  </TableContainer>
);

interface Props {
  groups: TuningSetupGroupDTO[];
  /** Primeira coleta do carro: vira a "Recomendação inicial", em destaque. Senão é só uma referência recolhida. */
  emphasized: boolean;
}

/**
 * Configuração inicial do desenvolvedor (valores absolutos, em texto como o jogo mostra). Em destaque antes do primeiro ciclo
 * de coleta, como ponto de partida; depois disso, uma referência recolhida (as sugestões do ciclo dizem só quanto mexer).
 */
const InitialSetup: FC<Props> = ({ groups, emphasized }) => {
  if (!emphasized) {
    return (
      <Accordion variant="outlined" disableGutters sx={{ mt: 3, borderRadius: 2, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandIcon />} aria-controls="config-inicial-conteudo" id="config-inicial-cabecalho">
          <Typography sx={{ fontWeight: 600 }}>Configuração inicial de referência</Typography>
        </AccordionSummary>
        <AccordionDetails id="config-inicial-conteudo">
          <SetupTable groups={groups} />
        </AccordionDetails>
      </Accordion>
    );
  }
  return (
    <Box component="section" aria-labelledby="recomendacao-inicial-titulo" sx={{ mb: 4 }}>
      <Typography id="recomendacao-inicial-titulo" variant="h6" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
        Recomendação inicial
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1.5 }}>
        Ponto de partida: aplique esta configuração no carro antes de coletar. Quando houver sessões suficientes, as sugestões do ciclo dizem quanto
        mexer a partir dela.
      </Typography>
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <SetupTable groups={groups} />
      </Paper>
    </Box>
  );
};

export default InitialSetup;

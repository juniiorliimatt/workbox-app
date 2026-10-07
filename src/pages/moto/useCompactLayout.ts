import { useMediaQuery, useTheme } from '@mui/material';

/**
 * Celular (abaixo do breakpoint `sm`): as listas de registros viram cartões em vez de tabela. Uma tabela de 6+ colunas
 * não cabe em 390 px — sumia o "Valor" e, pior, os botões de editar/excluir. Só um dos layouts é renderizado por vez.
 */
export const useCompactLayout = (): boolean => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
};

export default useCompactLayout;

import { createContext } from 'react';
import type { AlertColor } from '@mui/material';

export interface SnackbarContextType {
  showSnackbar: (message: string, severity?: AlertColor) => void;
}

/** Separado do `SnackbarProvider` para o arquivo do componente só exportar componentes (Fast Refresh). */
export const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/pt-br';
import { RouterProvider } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import router from '@/routes/routes';
import { AuthProvider } from '@/contexts/AuthContext';
import { ColorModeProvider } from '@/contexts/ColorModeContext';
import { SnackbarProvider } from '@/contexts/SnackbarContext';

function App() {
  return (
    <ColorModeProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
        {/* enableColorScheme: barras de rolagem e controles nativos do browser acompanham o tema */}
        <CssBaseline enableColorScheme />
        <SnackbarProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </SnackbarProvider>
      </LocalizationProvider>
    </ColorModeProvider>
  );
}

export default App;

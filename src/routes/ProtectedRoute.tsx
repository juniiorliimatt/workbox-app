import { FC } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Box, CircularProgress } from '@mui/material';
import { IdleMonitor } from '@/components/IdleMonitor';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';

export const ProtectedRoute: FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  // Instala uma vez o interceptor 401 → refresh → repete a chamada, para TODA tela autenticada. As de Administração e o avatar
  // montam o header à mão (sem `useAxiosWithAuth`) e, sem isto, um token vencido virava "Falha ao carregar" em vez de renovar.
  useAxiosWithAuth();

  if (isLoading) {
    return (
      <Box
        data-testid="auth-loading"
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <IdleMonitor />
      <Outlet />
    </>
  );
};

export default ProtectedRoute;

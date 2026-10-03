import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import ProtectedRoute from '@/routes/ProtectedRoute';
import PublicRoute from '@/routes/PublicRoute';
import ResetPassword from '@/pages/ResetPassword';

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/',
        element: <Login />,
      },
      {
        path: '/reset-password',
        element: <ResetPassword />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        lazy: async () => ({ Component: (await import('@/pages/Dashboard')).default }),
      },
      {
        path: '/financas',
        lazy: async () => ({ Component: (await import('@/pages/Financas')).default }),
      },
      {
        path: '/financas/receitas',
        lazy: async () => ({ Component: (await import('@/pages/financas/Receitas')).default }),
      },
      {
        path: '/financas/despesas',
        lazy: async () => ({ Component: (await import('@/pages/financas/Despesas')).default }),
      },
      
      {
        path: '/financas/orcamentos',
        lazy: async () => ({ Component: (await import('@/pages/financas/Orcamentos')).default }),
      },
      {
        path: '/financas/tipos',
        lazy: async () => ({ Component: (await import('@/pages/financas/GerenciarTipos')).default }),
      },
      {
        path: '/forza',
        lazy: async () => ({ Component: (await import('@/pages/Forza')).default }),
      },
      {
        path: '/forza/sessoes',
        lazy: async () => ({ Component: (await import('@/pages/forza/Sessoes')).default }),
      },
      {
        path: '/forza/sessoes/:id',
        lazy: async () => ({ Component: (await import('@/pages/forza/SessaoDetalhe')).default }),
      },
      {
        path: '/forza/ao-vivo',
        lazy: async () => ({ Component: (await import('@/pages/forza/AoVivo')).default }),
      },
      {
        path: '/forza/tuning',
        lazy: async () => ({ Component: (await import('@/pages/forza/TuningCarros')).default }),
      },
      {
        path: '/forza/tuning/historico',
        lazy: async () => ({ Component: (await import('@/pages/forza/TuningHistorico')).default }),
      },
      {
        path: '/forza/tuning/historico/:id',
        lazy: async () => ({ Component: (await import('@/pages/forza/TuningHistoricoDetalhe')).default }),
      },
      {
        path: '/forza/tuning/:carOrdinal',
        lazy: async () => ({ Component: (await import('@/pages/forza/TuningCarro')).default }),
      },
      {
        path: '/admin',
        lazy: async () => ({ Component: (await import('@/pages/Admin')).default }),
      },
      {
        path: '/admin/usuarios',
        lazy: async () => ({ Component: (await import('@/pages/AdminUsuarios')).default }),
      },
      {
        path: '/admin/papeis',
        lazy: async () => ({ Component: (await import('@/pages/AdminPapeis')).default }),
      },
      {
        path: '/admin/auditoria',
        lazy: async () => ({ Component: (await import('@/pages/AdminAuditoria')).default }),
      },
      {
        path: '/perfil',
        lazy: async () => ({ Component: (await import('@/pages/Perfil')).default }),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;

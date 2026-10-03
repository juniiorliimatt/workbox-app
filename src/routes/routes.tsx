import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Financas from '@/pages/Financas';
import Receitas from '@/pages/financas/Receitas';
import Despesas from '@/pages/financas/Despesas';
import Orcamentos from '@/pages/financas/Orcamentos';
import GerenciarTipos from '@/pages/financas/GerenciarTipos';
import Admin from '@/pages/Admin';
import AdminUsuarios from '@/pages/AdminUsuarios';
import AdminPapeis from '@/pages/AdminPapeis';
import AdminAuditoria from '@/pages/AdminAuditoria';
import Perfil from '@/pages/Perfil';
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
        element: <Dashboard />,
      },
      {
        path: '/financas',
        element: <Financas />,
      },
      {
        path: '/financas/receitas',
        element: <Receitas />,
      },
      {
        path: '/financas/despesas',
        element: <Despesas />,
      },
      
      {
        path: '/financas/orcamentos',
        element: <Orcamentos />,
      },
      {
        path: '/financas/tipos',
        element: <GerenciarTipos />,
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
        path: '/admin',
        element: <Admin />,
      },
      {
        path: '/admin/usuarios',
        element: <AdminUsuarios />,
      },
      {
        path: '/admin/papeis',
        element: <AdminPapeis />,
      },
      {
        path: '/admin/auditoria',
        element: <AdminAuditoria />,
      },
      {
        path: '/perfil',
        element: <Perfil />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;

import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Financas from '@/pages/Financas';
import Admin from '@/pages/Admin';
import AdminUsuarios from '@/pages/AdminUsuarios';
import AdminPapeis from '@/pages/AdminPapeis';
import AdminAuditoria from '@/pages/AdminAuditoria';
import Perfil from '@/pages/Perfil';
import ProtectedRoute from '@/routes/ProtectedRoute';
import PublicRoute from '@/routes/PublicRoute';

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/',
        element: <Login />,
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

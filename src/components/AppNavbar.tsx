import { FC, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  AppBar,
  Box,
  Button,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import UserAvatar from '@/components/UserAvatar';

export interface IAppNavbarProps {
  title: string;
  icon?: ReactNode;
  showBackButton?: boolean;
  backPath?: string;
  backLabel?: string;
}

export const AppNavbar: FC<IAppNavbarProps> = ({
  title,
  icon,
  showBackButton = false,
  backPath = '/dashboard',
  backLabel = 'Voltar aos Módulos',
}) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <AppBar position="static" color="primary" elevation={1} sx={{ width: '100%' }}>
      <Toolbar>
        {showBackButton && (
          <Button
            id="btn-voltar-dashboard"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(backPath)}
            sx={{ mr: 2 }}
          >
            {backLabel}
          </Button>
        )}

        {icon && <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>{icon}</Box>}

        <Typography variant="h6" component="h1" sx={{ flexGrow: 1, fontWeight: 600 }}>
          {title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Botão de Perfil / Edição Permanente em todos os módulos */}
          <Button
            id="btn-perfil"
            color="inherit"
            startIcon={
              <UserAvatar
                avatarUrl={user?.avatarUrl}
                name={user?.socialName}
                sx={{ bgcolor: 'secondary.main', width: 28, height: 28, fontSize: '0.85rem' }}
              />
            }
            onClick={() => navigate('/perfil')}
            sx={{ textTransform: 'none', color: 'inherit' }}
          >
            <Box sx={{ textAlign: 'left', ml: 0.5, display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {user?.socialName || user?.email || 'Usuário'}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', fontSize: '0.7rem' }}>
                {isAdmin ? 'Administrador' : 'Meu Perfil'}
              </Typography>
            </Box>
          </Button>

          {/* Botão de Sair Permanente em todos os módulos */}
          <Button
            id="btn-logout"
            color="inherit"
            variant="outlined"
            size="small"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ borderColor: 'rgba(255,255,255,0.5)' }}
          >
            Sair
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppNavbar;

import React, { FC, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Container,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import api from '@/services/api';

const resetSchema = yup.object().shape({
  newPassword: yup
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .max(100, 'Máximo de 100 caracteres')
    .required('Nova senha é obrigatória'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'As senhas não conferem')
    .required('Confirmação de senha é obrigatória'),
});

const ResetPassword: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(resetSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: any) => {
    if (!token) {
      setFeedback({ type: 'error', msg: 'Token de recuperação não encontrado na URL.' });
      return;
    }
    setFeedback(null);
    try {
      await api.post('/api/v1/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });
      setFeedback({
        type: 'success',
        msg: 'Senha redefinida com sucesso! Você pode fazer login agora.',
      });
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        setFeedback({ type: 'error', msg: err.response.data.detail });
      } else {
        setFeedback({ type: 'error', msg: 'Erro inesperado ao redefinir a senha. Tente novamente mais tarde.' });
      }
    }
  };

  if (!token) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Token de recuperação inválido ou ausente. Por favor, acesse através do link recebido por e-mail.
        </Alert>
        <Button variant="outlined" fullWidth onClick={() => navigate('/')}>
          Voltar ao Início
        </Button>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card elevation={3} sx={{ maxWidth: 450, width: '100%', borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
              Redefinir Senha
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Crie uma nova senha para sua conta
            </Typography>
          </Box>

          {feedback && (
            <Alert severity={feedback.type} sx={{ mb: 3 }}>
              {feedback.msg}
            </Alert>
          )}

          {feedback?.type !== 'success' && (
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Nova Senha"
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                autoComplete="new-password"
                {...register('newPassword')}
                error={Boolean(errors.newPassword)}
                helperText={errors.newPassword?.message}
                disabled={isSubmitting}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                label="Confirmar Nova Senha"
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                autoComplete="new-password"
                {...register('confirmPassword')}
                error={Boolean(errors.confirmPassword)}
                helperText={errors.confirmPassword?.message}
                disabled={isSubmitting}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Exibir confirmação de senha'}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isSubmitting}
                sx={{ mt: 3, mb: 2 }}
              >
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Salvar Nova Senha'}
              </Button>
            </Box>
          )}

          <Button
            fullWidth
            variant="text"
            onClick={() => navigate('/')}
            sx={{ textTransform: 'none' }}
          >
            Voltar para o Login
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResetPassword;

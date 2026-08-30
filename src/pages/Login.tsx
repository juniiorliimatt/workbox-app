import { FC, FormEvent, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LockOutlined as LockIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';

interface ILoginFormInputs {
  username: string;
  password: string;
}

const loginSchema = yup.object().shape({
  username: yup.string().required('Usuário é obrigatório'),
  password: yup.string().required('Senha é obrigatória'),
});

const Login: FC = () => {
  const { login, loginMfa, mfaRequired } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState<string>('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [isSubmittingMfa, setIsSubmittingMfa] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ILoginFormInputs>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: ILoginFormInputs) => {
    setErrorMessage(null);
    try {
      await login(data.username, data.password);
      if (!mfaRequired) {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setErrorMessage('Credenciais inválidas. Verifique seu usuário e senha.');
        } else if (err.response?.status === 429) {
          setErrorMessage('Muitas tentativas de login. Tente novamente em alguns minutos.');
        } else if (err.response?.data?.detail) {
          setErrorMessage(err.response.data.detail);
        } else {
          setErrorMessage('Falha ao autenticar. Tente novamente mais tarde.');
        }
      } else {
        setErrorMessage('Ocorreu um erro inesperado ao realizar login.');
      }
    }
  };

  const handleMfaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length < 6) {
      setMfaError('Informe o código de 6 dígitos.');
      return;
    }

    setMfaError(null);
    setIsSubmittingMfa(true);
    try {
      await loginMfa(mfaCode);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setMfaError('Código MFA inválido ou expirado.');
        } else if (err.response?.data?.detail) {
          setMfaError(err.response.data.detail);
        } else {
          setMfaError('Falha ao validar MFA. Tente novamente.');
        }
      } else {
        setMfaError('Ocorreu um erro inesperado.');
      }
    } finally {
      setIsSubmittingMfa(false);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        px: 2,
        py: 4,
        bgcolor: 'background.default',
      }}
    >
      <Container component="main" maxWidth="xs" disableGutters>
        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, sm: 4 },
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              m: 1,
              bgcolor: 'primary.main',
              color: 'white',
              p: 1.5,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {mfaRequired ? <SecurityIcon fontSize="medium" /> : <LockIcon fontSize="medium" />}
          </Box>

          <Typography component="h1" variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            {mfaRequired ? 'Autenticação em Duas Etapas' : 'Workbox App'}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {mfaRequired
              ? 'Digite o código de 6 dígitos do seu autenticador'
              : 'Faça login para acessar sua conta'}
          </Typography>

          {mfaRequired ? (
            <Box component="form" onSubmit={handleMfaSubmit} sx={{ width: '100%' }} noValidate>
              {mfaError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {mfaError}
                </Alert>
              )}

              <TextField
                margin="normal"
                required
                fullWidth
                id="mfa-code"
                label="Código MFA"
                name="mfaCode"
                autoFocus
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
                disabled={isSubmittingMfa}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3, mb: 1, height: 48 }}
                disabled={isSubmittingMfa}
              >
                {isSubmittingMfa ? <CircularProgress size={24} color="inherit" /> : 'Verificar'}
              </Button>
            </Box>
          ) : (
            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              sx={{ width: '100%' }}
              noValidate
            >
              {errorMessage && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errorMessage}
                </Alert>
              )}

              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Usuário"
                autoComplete="username"
                autoFocus
                {...register('username')}
                error={Boolean(errors.username)}
                helperText={errors.username?.message}
                disabled={isSubmitting}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                {...register('password')}
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
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

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3, mb: 1, height: 48 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Entrar'}
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;

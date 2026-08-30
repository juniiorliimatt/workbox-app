import { FC, FormEvent, useEffect, useState } from 'react';
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
  Checkbox,
  CircularProgress,
  Container,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LockOutlined as LockIcon,
  Security as SecurityIcon,
  PersonAddOutlined as PersonAddIcon,
} from '@mui/icons-material';

const STORAGE_REMEMBER_KEY = 'workbox_remembered_email';

interface ILoginFormInputs {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface IRegisterFormInputs {
  socialName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const loginSchema = yup.object().shape({
  email: yup.string().email('Informe um e-mail válido').required('E-mail é obrigatório'),
  password: yup.string().required('Senha é obrigatória'),
  rememberMe: yup.boolean().optional(),
});

const registerSchema = yup.object().shape({
  socialName: yup
    .string()
    .min(2, 'Nome social deve ter no mínimo 2 caracteres')
    .max(120, 'Máximo de 120 caracteres')
    .required('Nome social é obrigatório'),
  email: yup
    .string()
    .email('Informe um e-mail válido')
    .required('E-mail é obrigatório'),
  password: yup
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .max(100, 'Máximo de 100 caracteres')
    .required('Senha é obrigatória'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'As senhas não conferem')
    .required('Confirmação de senha é obrigatória'),
});

const Login: FC = () => {
  const { login, registerUser, loginMfa, mfaRequired } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [mfaCode, setMfaCode] = useState<string>('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [isSubmittingMfa, setIsSubmittingMfa] = useState<boolean>(false);

  // Form de Login
  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    setValue: setLoginValue,
    formState: { errors: loginErrors, isSubmitting: isLoggingIn },
  } = useForm<ILoginFormInputs>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // Form de Cadastro
  const {
    register: registerSignUp,
    handleSubmit: handleSubmitSignUp,
    reset: resetSignUpForm,
    formState: { errors: signUpErrors, isSubmitting: isSigningUp },
  } = useForm<IRegisterFormInputs>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      socialName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Carrega "Lembrar de mim" do localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem(STORAGE_REMEMBER_KEY);
    if (savedEmail) {
      setLoginValue('email', savedEmail);
      setLoginValue('rememberMe', true);
    }
  }, [setLoginValue]);

  const onLoginSubmit = async (data: ILoginFormInputs) => {
    setErrorMessage(null);
    try {
      await login(data.email, data.password);

      // Gerencia persistência de "Lembrar de mim"
      if (data.rememberMe) {
        localStorage.setItem(STORAGE_REMEMBER_KEY, data.email);
      } else {
        localStorage.removeItem(STORAGE_REMEMBER_KEY);
      }

      if (!mfaRequired) {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setErrorMessage('Credenciais inválidas. Verifique seu e-mail e senha.');
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

  const onSignUpSubmit = async (data: IRegisterFormInputs) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await registerUser({
        socialName: data.socialName,
        email: data.email,
        password: data.password,
      });
      setSuccessMessage('Conta criada com sucesso! Faça login com suas credenciais.');
      resetSignUpForm();
      setActiveTab(0);
      setLoginValue('email', data.email);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          setErrorMessage(err.response.data?.detail || 'E-mail já cadastrado no sistema.');
        } else if (err.response?.data?.detail) {
          setErrorMessage(err.response.data.detail);
        } else {
          setErrorMessage('Falha ao cadastrar novo usuário. Tente novamente.');
        }
      } else {
        setErrorMessage('Ocorreu um erro inesperado ao cadastrar usuário.');
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
            {mfaRequired ? (
              <SecurityIcon fontSize="medium" />
            ) : activeTab === 1 ? (
              <PersonAddIcon fontSize="medium" />
            ) : (
              <LockIcon fontSize="medium" />
            )}
          </Box>

          <Typography component="h1" variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            {mfaRequired
              ? 'Autenticação em Duas Etapas'
              : activeTab === 1
              ? 'Criar Nova Conta'
              : 'Workbox App'}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
            {mfaRequired
              ? 'Digite o código de 6 dígitos do seu autenticador'
              : activeTab === 1
              ? 'Preencha os dados abaixo para cadastrar seu usuário'
              : 'Faça login com seu e-mail para acessar sua conta'}
          </Typography>

          {!mfaRequired && (
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => {
                setActiveTab(newValue);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              variant="fullWidth"
              sx={{ width: '100%', mb: 2, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Entrar" />
              <Tab label="Novo Usuário" />
            </Tabs>
          )}

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {errorMessage}
            </Alert>
          )}

          {successMessage && (
            <Alert severity="success" sx={{ mb: 2, width: '100%' }}>
              {successMessage}
            </Alert>
          )}

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
          ) : activeTab === 0 ? (
            /* Formulário de Login com E-mail */
            <Box
              component="form"
              onSubmit={handleSubmitLogin(onLoginSubmit)}
              sx={{ width: '100%' }}
              noValidate
            >
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="E-mail"
                type="email"
                autoComplete="email"
                autoFocus
                {...registerLogin('email')}
                error={Boolean(loginErrors.email)}
                helperText={loginErrors.email?.message}
                disabled={isLoggingIn}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                {...registerLogin('password')}
                error={Boolean(loginErrors.password)}
                helperText={loginErrors.password?.message}
                disabled={isLoggingIn}
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

              <FormControlLabel
                control={<Checkbox id="rememberMe" {...registerLogin('rememberMe')} color="primary" />}
                label={<Typography variant="body2">Lembrar de mim</Typography>}
                sx={{ mt: 1, width: '100%', userSelect: 'none' }}
              />

              <Button
                type="submit"
                id="btn-login-submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 2, mb: 2, height: 48 }}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? <CircularProgress size={24} color="inherit" /> : 'Entrar'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={() => {
                    setActiveTab(1);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  underline="hover"
                >
                  Não tem uma conta? Cadastre-se
                </Link>
              </Box>
            </Box>
          ) : (
            /* Formulário de Novo Usuário (Cadastro com Nome Social e E-mail) */
            <Box
              component="form"
              onSubmit={handleSubmitSignUp(onSignUpSubmit)}
              sx={{ width: '100%' }}
              noValidate
            >
              <TextField
                margin="normal"
                required
                fullWidth
                id="signup-social-name"
                label="Nome Social / Completo"
                placeholder="Como prefere ser chamado"
                autoComplete="name"
                autoFocus
                {...registerSignUp('socialName')}
                error={Boolean(signUpErrors.socialName)}
                helperText={signUpErrors.socialName?.message}
                disabled={isSigningUp}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                id="signup-email"
                label="E-mail"
                type="email"
                autoComplete="email"
                {...registerSignUp('email')}
                error={Boolean(signUpErrors.email)}
                helperText={signUpErrors.email?.message}
                disabled={isSigningUp}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                id="signup-password"
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                {...registerSignUp('password')}
                error={Boolean(signUpErrors.password)}
                helperText={signUpErrors.password?.message}
                disabled={isSigningUp}
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
                id="signup-confirm-password"
                label="Confirmar Senha"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                {...registerSignUp('confirmPassword')}
                error={Boolean(signUpErrors.confirmPassword)}
                helperText={signUpErrors.confirmPassword?.message}
                disabled={isSigningUp}
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
                id="btn-signup-submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3, mb: 2, height: 48 }}
                disabled={isSigningUp}
              >
                {isSigningUp ? <CircularProgress size={24} color="inherit" /> : 'Criar Conta'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={() => {
                    setActiveTab(0);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  underline="hover"
                >
                  Já tem uma conta? Faça login
                </Link>
              </Box>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;

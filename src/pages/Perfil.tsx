import { FC, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import {
  Person as PersonIcon,
  Lock as LockIcon,
  Security as SecurityIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckCircleIcon,
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
} from '@mui/icons-material';
import AppNavbar from '@/components/AppNavbar';
import { IMfaEnrollResponse } from '@/interfaces/IMfaEnrollResponse';

interface IEditProfileInputs {
  socialName: string;
  email: string;
  confirmPassword: string;
}

interface IChangePasswordInputs {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

const editProfileSchema = yup.object().shape({
  socialName: yup
    .string()
    .min(2, 'Nome social deve ter no mínimo 2 caracteres')
    .max(120, 'Máximo de 120 caracteres')
    .required('Nome social é obrigatório'),
  email: yup
    .string()
    .email('Informe um e-mail válido')
    .required('E-mail é obrigatório'),
  confirmPassword: yup
    .string()
    .required('Informe sua senha atual para confirmar a alteração'),
});

const passwordSchema = yup.object().shape({
  currentPassword: yup.string().required('Senha atual é obrigatória'),
  newPassword: yup
    .string()
    .min(8, 'A nova senha deve ter no mínimo 8 caracteres')
    .max(100, 'Máximo de 100 caracteres')
    .required('Nova senha é obrigatória'),
  confirmNewPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'As novas senhas não conferem')
    .required('Confirmação de nova senha é obrigatória'),
});

const Perfil: FC = () => {
  const {
    user,
    isAdmin,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    changePassword,
    enrollMfa,
    verifyMfa,
    disableMfa,
  } = useAuth();

  // Estados de Avatar
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Estados de Edição de Perfil
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showProfilePassword, setShowProfilePassword] = useState<boolean>(false);

  // Estados de Senha
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState<boolean>(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Estados de MFA
  const [enrollData, setEnrollData] = useState<IMfaEnrollResponse | null>(null);
  const [mfaCode, setMfaCode] = useState<string>('');
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [isEnrollingMfa, setIsEnrollingMfa] = useState<boolean>(false);
  const [isVerifyingMfa, setIsVerifyingMfa] = useState<boolean>(false);
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);
  const [isDisablingMfa, setIsDisablingMfa] = useState<boolean>(false);
  const [disableCode, setDisableCode] = useState<string>('');

  // Form de Perfil
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfileForm,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = useForm<IEditProfileInputs>({
    resolver: yupResolver(editProfileSchema),
    defaultValues: {
      socialName: user?.socialName || '',
      email: user?.email || '',
      confirmPassword: '',
    },
  });

  // Atualiza valores do formulário de perfil se o usuário mudar
  useEffect(() => {
    if (user) {
      resetProfileForm({
        socialName: user.socialName || '',
        email: user.email || '',
        confirmPassword: '',
      });
    }
  }, [user, resetProfileForm]);

  // Form de Senha
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm<IChangePasswordInputs>({
    resolver: yupResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onProfileSubmit = async (data: IEditProfileInputs) => {
    setProfileSuccess(null);
    setProfileError(null);
    try {
      await updateProfile(data.socialName, data.email, data.confirmPassword);
      setProfileSuccess('Informações cadastrais atualizadas com sucesso!');
      resetProfileForm({
        socialName: data.socialName,
        email: data.email,
        confirmPassword: '',
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401 || err.response?.status === 400) {
          setProfileError(err.response.data?.detail || 'Senha de confirmação incorreta.');
        } else if (err.response?.status === 409) {
          setProfileError(err.response.data?.detail || 'E-mail já está em uso por outro usuário.');
        } else if (err.response?.data?.detail) {
          setProfileError(err.response.data.detail);
        } else {
          setProfileError('Falha ao atualizar dados cadastrais. Verifique os campos.');
        }
      } else {
        setProfileError('Ocorreu um erro inesperado ao atualizar o perfil.');
      }
    }
  };

  const onPasswordSubmit = async (data: IChangePasswordInputs) => {
    setPasswordSuccess(null);
    setPasswordError(null);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      setPasswordSuccess('Senha alterada com sucesso!');
      resetPasswordForm();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401 || err.response?.status === 400) {
          setPasswordError(err.response.data?.detail || 'Senha atual incorreta.');
        } else if (err.response?.data?.detail) {
          setPasswordError(err.response.data.detail);
        } else {
          setPasswordError('Falha ao atualizar senha. Verifique os dados informados.');
        }
      } else {
        setPasswordError('Ocorreu um erro inesperado ao alterar a senha.');
      }
    }
  };

  const handleStartMfaEnroll = async () => {
    setMfaError(null);
    setMfaSuccess(null);
    setIsEnrollingMfa(true);
    try {
      const data = await enrollMfa();
      setEnrollData(data);
      setMfaCode('');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setMfaError(err.response?.data?.detail || 'Falha ao iniciar configuração de MFA.');
      } else {
        setMfaError('Erro inesperado ao gerar segredo MFA.');
      }
    } finally {
      setIsEnrollingMfa(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaCode || mfaCode.length < 6) {
      setMfaError('Informe o código de 6 dígitos gerado no seu autenticador.');
      return;
    }

    setMfaError(null);
    setMfaSuccess(null);
    setIsVerifyingMfa(true);
    try {
      await verifyMfa(mfaCode);
      setMfaSuccess('Autenticação em Duas Etapas (MFA) ativada com sucesso!');
      setEnrollData(null);
      setMfaCode('');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setMfaError(err.response?.data?.detail || 'Código MFA inválido. Tente novamente.');
      } else {
        setMfaError('Falha ao validar código MFA.');
      }
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!disableCode || disableCode.length < 6) {
      setMfaError('Informe o código de 6 dígitos para confirmar a desativação.');
      return;
    }

    setMfaError(null);
    setMfaSuccess(null);
    setIsVerifyingMfa(true);
    try {
      await disableMfa(disableCode);
      setMfaSuccess('Autenticação em Duas Etapas (MFA) desativada com sucesso.');
      setIsDisablingMfa(false);
      setDisableCode('');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setMfaError(err.response?.data?.detail || 'Código incorreto para desativação.');
      } else {
        setMfaError('Falha ao desativar MFA.');
      }
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  const handleCopySecret = () => {
    if (enrollData?.secret) {
      navigator.clipboard.writeText(enrollData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('A imagem deve ter no máximo 2MB.');
      return;
    }

    setAvatarError(null);
    setAvatarSuccess(null);
    setIsUploadingAvatar(true);
    try {
      await uploadAvatar(file);
      setAvatarSuccess('Foto de perfil atualizada com sucesso!');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setAvatarError(err.response?.data?.detail || 'Falha ao enviar imagem. Use formatos PNG, JPEG ou WEBP.');
      } else {
        setAvatarError('Erro ao processar imagem de perfil.');
      }
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError(null);
    setAvatarSuccess(null);
    setIsUploadingAvatar(true);
    try {
      await deleteAvatar();
      setAvatarSuccess('Foto de perfil removida com sucesso.');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setAvatarError(err.response?.data?.detail || 'Falha ao remover foto.');
      } else {
        setAvatarError('Erro ao remover imagem de perfil.');
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      {/* Barra de Navegação Permanente com Perfil e Logout */}
      <AppNavbar
        title="Meu Perfil & Segurança"
        icon={<PersonIcon sx={{ fontSize: 28 }} />}
        showBackButton
        backPath="/dashboard"
        backLabel="Voltar aos Módulos"
      />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Paper elevation={1} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          {avatarSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {avatarSuccess}
            </Alert>
          )}
          {avatarError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {avatarError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={user?.avatarUrl ? user.avatarUrl : undefined}
                sx={{ bgcolor: 'secondary.main', width: 72, height: 72, fontSize: 32 }}
              >
                {!user?.avatarUrl && <PersonIcon sx={{ fontSize: 40 }} />}
              </Avatar>
              <Box>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                  {user?.socialName || 'Usuário'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email || 'E-mail não cadastrado'} &bull; {isAdmin ? 'Administrador' : 'Usuário Padrão'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <input
                id="avatar-file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
                disabled={isUploadingAvatar}
              />
              <label htmlFor="avatar-file-input">
                <Button
                  variant="outlined"
                  component="span"
                  size="small"
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? <CircularProgress size={20} /> : 'Alterar Foto'}
                </Button>
              </label>
              {user?.avatarUrl && (
                <Button
                  variant="text"
                  color="error"
                  size="small"
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar}
                >
                  Remover Foto
                </Button>
              )}
            </Box>
          </Box>
        </Paper>

        <Grid container spacing={3}>
          {/* Card 1: Editar Informações do Usuário (Nome Social & E-mail) */}
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                    Editar Dados Cadastrais
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {profileSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {profileSuccess}
                  </Alert>
                )}

                {profileError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {profileError}
                  </Alert>
                )}

                <Box
                  component="form"
                  onSubmit={handleSubmitProfile(onProfileSubmit)}
                  noValidate
                >
                  <TextField
                    margin="dense"
                    fullWidth
                    label="ID Único (UUID)"
                    value={user?.id || ''}
                    disabled
                    size="small"
                    InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                    sx={{ mb: 1 }}
                  />

                  <TextField
                    margin="dense"
                    required
                    fullWidth
                    label="Nome Social / Como quer ser chamado"
                    id="edit-social-name"
                    {...registerProfile('socialName')}
                    error={Boolean(profileErrors.socialName)}
                    helperText={profileErrors.socialName?.message}
                    disabled={isSubmittingProfile}
                  />

                  <TextField
                    margin="dense"
                    required
                    fullWidth
                    label="Endereço de E-mail"
                    type="email"
                    id="edit-email"
                    {...registerProfile('email')}
                    error={Boolean(profileErrors.email)}
                    helperText={profileErrors.email?.message}
                    disabled={isSubmittingProfile}
                  />

                  <TextField
                    margin="dense"
                    required
                    fullWidth
                    label="Confirmar com Senha Atual"
                    type={showProfilePassword ? 'text' : 'password'}
                    id="edit-confirm-password"
                    autoComplete="current-password"
                    {...registerProfile('confirmPassword')}
                    error={Boolean(profileErrors.confirmPassword)}
                    helperText={profileErrors.confirmPassword?.message}
                    disabled={isSubmittingProfile}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showProfilePassword ? 'Ocultar senha' : 'Exibir senha'}
                            onClick={() => setShowProfilePassword(!showProfilePassword)}
                            edge="end"
                          >
                            {showProfilePassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Box sx={{ display: 'flex', gap: 1, my: 1.5, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={user?.enabled ? 'Conta Ativa' : 'Inativa'}
                      color={user?.enabled ? 'success' : 'default'}
                      size="small"
                    />
                    <Chip
                      label={isAdmin ? 'ROLE_ADMIN' : 'ROLE_USER'}
                      color={isAdmin ? 'primary' : 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    startIcon={<SaveIcon />}
                    sx={{ mt: 1 }}
                    disabled={isSubmittingProfile}
                  >
                    {isSubmittingProfile ? <CircularProgress size={24} color="inherit" /> : 'Salvar Alterações'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 2: Alteração de Senha */}
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LockIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                    Alterar Senha
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {passwordSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {passwordSuccess}
                  </Alert>
                )}

                {passwordError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {passwordError}
                  </Alert>
                )}

                <Box
                  component="form"
                  onSubmit={handleSubmitPassword(onPasswordSubmit)}
                  noValidate
                >
                  <TextField
                    margin="dense"
                    required
                    fullWidth
                    label="Senha Atual"
                    type={showCurrentPassword ? 'text' : 'password'}
                    id="currentPassword"
                    autoComplete="current-password"
                    {...registerPassword('currentPassword')}
                    error={Boolean(passwordErrors.currentPassword)}
                    helperText={passwordErrors.currentPassword?.message}
                    disabled={isSubmittingPassword}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showCurrentPassword ? 'Ocultar senha' : 'Exibir senha'}
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            edge="end"
                          >
                            {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    margin="dense"
                    required
                    fullWidth
                    label="Nova Senha"
                    type={showNewPassword ? 'text' : 'password'}
                    id="newPassword"
                    autoComplete="new-password"
                    {...registerPassword('newPassword')}
                    error={Boolean(passwordErrors.newPassword)}
                    helperText={passwordErrors.newPassword?.message}
                    disabled={isSubmittingPassword}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showNewPassword ? 'Ocultar nova senha' : 'Exibir nova senha'}
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            edge="end"
                          >
                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    margin="dense"
                    required
                    fullWidth
                    label="Confirmar Nova Senha"
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    id="confirmNewPassword"
                    autoComplete="new-password"
                    {...registerPassword('confirmNewPassword')}
                    error={Boolean(passwordErrors.confirmNewPassword)}
                    helperText={passwordErrors.confirmNewPassword?.message}
                    disabled={isSubmittingPassword}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showConfirmNewPassword ? 'Ocultar confirmação' : 'Exibir confirmação'}
                            onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                            edge="end"
                          >
                            {showConfirmNewPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{ mt: 2 }}
                    disabled={isSubmittingPassword}
                  >
                    {isSubmittingPassword ? <CircularProgress size={24} color="inherit" /> : 'Atualizar Senha'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 3: Autenticação em Duas Etapas (MFA / 2FA) */}
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SecurityIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                    Duas Etapas (MFA)
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Adicione uma camada extra de proteção à sua conta exigindo um código TOTP (Google Authenticator / Authy) no login.
                </Typography>

                {mfaSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {mfaSuccess}
                  </Alert>
                )}

                {mfaError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {mfaError}
                  </Alert>
                )}

                {enrollData ? (
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      1. Adicione a chave ao seu autenticador:
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'white', p: 1, borderRadius: 1, mb: 2 }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', flexGrow: 1 }}>
                        {enrollData.secret}
                      </Typography>
                      <IconButton size="small" onClick={handleCopySecret} title="Copiar Chave">
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    {copiedSecret && (
                      <Typography variant="caption" color="success.main" sx={{ display: 'block', mb: 1 }}>
                        Chave copiada para a área de transferência!
                      </Typography>
                    )}

                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      2. Digite o código de 6 dígitos gerado:
                    </Typography>

                    <TextField
                      size="small"
                      fullWidth
                      id="mfa-verify-code"
                      placeholder="Ex: 123456"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
                      sx={{ mb: 2, bgcolor: 'white' }}
                      disabled={isVerifyingMfa}
                    />

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        size="small"
                        onClick={handleVerifyMfa}
                        disabled={isVerifyingMfa}
                      >
                        {isVerifyingMfa ? <CircularProgress size={20} color="inherit" /> : 'Confirmar e Ativar'}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setEnrollData(null)}
                        disabled={isVerifyingMfa}
                      >
                        Cancelar
                      </Button>
                    </Box>
                  </Box>
                ) : isDisablingMfa ? (
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Confirmar Desativação de MFA:
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                      Digite o código de 6 dígitos do autenticador para confirmar.
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      id="mfa-disable-code"
                      placeholder="Código de 6 dígitos"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value)}
                      inputProps={{ maxLength: 6, inputMode: 'numeric' }}
                      sx={{ mb: 2, bgcolor: 'white' }}
                      disabled={isVerifyingMfa}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="error"
                        fullWidth
                        size="small"
                        onClick={handleDisableMfa}
                        disabled={isVerifyingMfa}
                      >
                        {isVerifyingMfa ? <CircularProgress size={20} color="inherit" /> : 'Desativar'}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setIsDisablingMfa(false)}
                        disabled={isVerifyingMfa}
                      >
                        Voltar
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                      id="btn-mfa-enroll"
                      variant="contained"
                      color="primary"
                      fullWidth
                      startIcon={<SecurityIcon />}
                      onClick={handleStartMfaEnroll}
                      disabled={isEnrollingMfa}
                    >
                      {isEnrollingMfa ? <CircularProgress size={24} color="inherit" /> : 'Configurar / Habilitar MFA'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="inherit"
                      fullWidth
                      onClick={() => setIsDisablingMfa(true)}
                    >
                      Desativar MFA
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Perfil;

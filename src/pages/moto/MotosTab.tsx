import { FC, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useSnackbar } from '@/hooks/useSnackbar';
import { IMotorcycle, IMotorcycleRequest } from '@/interfaces/moto';
import { errorMessage } from '@/pages/moto/errors';
import { formatKm } from '@/pages/moto/format';
import { createMotorcycle, deleteMotorcycle, updateMotorcycle } from '@/services/motoApi';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';

export interface MotosTabProps {
  motos: IMotorcycle[];
  /** Avisa que a lista de motos mudou (cadastro, edição ou exclusão) para a página recarregá-la. */
  onChanged: () => void;
}

/** Os campos numéricos ficam como texto no formulário (aceitam vírgula, sem setas do browser) e são convertidos no envio. */
interface FormValues {
  nickname: string;
  brand: string;
  model: string;
  modelYear: string;
  plate: string;
  initialOdometerKm: string;
  tankCapacityLiters: string;
  active: boolean;
}

const EMPTY: FormValues = {
  nickname: '',
  brand: '',
  model: '',
  modelYear: '',
  plate: '',
  initialOdometerKm: '',
  tankCapacityLiters: '',
  active: true,
};

const schema = yup.object().shape({
  nickname: yup.string().trim().required('Apelido é obrigatório').max(60, 'Máximo de 60 caracteres'),
  brand: yup.string().trim().max(60, 'Máximo de 60 caracteres').default(''),
  model: yup.string().trim().required('Modelo é obrigatório').max(60, 'Máximo de 60 caracteres'),
  modelYear: yup
    .string()
    .trim()
    .default('')
    .test('ano', 'Ano inválido', (value) => !value || (/^\d{4}$/.test(value) && Number(value) >= 1900 && Number(value) <= 2100)),
  plate: yup.string().trim().max(10, 'Máximo de 10 caracteres').default(''),
  initialOdometerKm: yup
    .string()
    .trim()
    .required('Hodômetro inicial é obrigatório')
    .matches(/^-?\d+$/, 'Informe um número inteiro')
    .test('nao-negativo', 'Hodômetro não pode ser negativo', (value) => !value || !value.startsWith('-')),
  tankCapacityLiters: yup
    .string()
    .trim()
    .default('')
    .test(
      'capacidade',
      'Capacidade inválida',
      (value) => !value || (/^\d{1,3}([.,]\d{1,2})?$/.test(value) && Number(value.replace(',', '.')) > 0),
    ),
  active: yup.boolean().default(true),
});

const toFormValues = (moto: IMotorcycle): FormValues => ({
  nickname: moto.nickname,
  brand: moto.brand ?? '',
  model: moto.model,
  modelYear: moto.modelYear?.toString() ?? '',
  plate: moto.plate ?? '',
  initialOdometerKm: moto.initialOdometerKm.toString(),
  tankCapacityLiters: moto.tankCapacityLiters?.toString() ?? '',
  active: moto.active,
});

const toRequest = (values: FormValues): IMotorcycleRequest => ({
  nickname: values.nickname.trim(),
  brand: values.brand.trim() || null,
  model: values.model.trim(),
  modelYear: values.modelYear.trim() ? Number(values.modelYear) : null,
  plate: values.plate.trim().toUpperCase() || null,
  initialOdometerKm: Number(values.initialOdometerKm),
  tankCapacityLiters: values.tankCapacityLiters.trim() ? Number(values.tankCapacityLiters.replace(',', '.')) : null,
  active: values.active,
});

/** Cadastro das motos do usuário: lista em cartões (mobile-first), formulário em diálogo e exclusão com confirmação. */
const MotosTab: FC<MotosTabProps> = ({ motos, onChanged }) => {
  const api = useAxiosWithAuth();
  const { showSnackbar } = useSnackbar();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IMotorcycle | null>(null);
  const [toDelete, setToDelete] = useState<IMotorcycle | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: yupResolver(schema), defaultValues: EMPTY });

  const openNew = () => {
    setEditing(null);
    reset(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (moto: IMotorcycle) => {
    setEditing(moto);
    reset(toFormValues(moto));
    setFormOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const body = toRequest(values);
    try {
      if (editing) {
        await updateMotorcycle(api, editing.id, body);
        showSnackbar('Moto atualizada com sucesso!', 'success');
      } else {
        await createMotorcycle(api, body);
        showSnackbar('Moto cadastrada com sucesso!', 'success');
      }
      setFormOpen(false);
      onChanged();
    } catch (e) {
      showSnackbar(errorMessage(e, 'Erro ao salvar moto'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const moto = toDelete;
    setToDelete(null);
    try {
      await deleteMotorcycle(api, moto.id);
      showSnackbar('Moto excluída com sucesso!', 'success');
      onChanged();
    } catch (e) {
      showSnackbar(errorMessage(e, 'Erro ao excluir moto'), 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h6" component="h2">
          Suas motos
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Nova moto
        </Button>
      </Box>

      {motos.length === 0 ? (
        <Typography color="text.secondary">Nenhuma moto cadastrada.</Typography>
      ) : (
        <Grid container spacing={2}>
          {motos.map((moto) => {
            const title = [moto.brand, moto.model].filter(Boolean).join(' ');
            return (
              <Grid item xs={12} md={6} key={moto.id}>
                <Card variant="outlined" component="article" sx={{ height: '100%' }}>
                  <CardContent sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="h6" component="h3">
                          {moto.nickname}
                        </Typography>
                        {!moto.active && <Chip size="small" label="Inativa" />}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {title}
                        {moto.modelYear ? ` · ${moto.modelYear}` : ''}
                      </Typography>
                      {moto.plate && (
                        <Typography variant="body2" color="text.secondary">
                          Placa {moto.plate}
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Hodômetro inicial: {formatKm(moto.initialOdometerKm)}
                      </Typography>
                      {moto.tankCapacityLiters !== null && (
                        <Typography variant="body2">
                          Tanque: {moto.tankCapacityLiters.toLocaleString('pt-BR')} L
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', flexShrink: 0 }}>
                      <IconButton aria-label={`Editar moto ${moto.nickname}`} onClick={() => openEdit(moto)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton aria-label={`Excluir moto ${moto.nickname}`} color="error" onClick={() => setToDelete(moto)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm" aria-labelledby="moto-form-title">
        <DialogTitle id="moto-form-title">{editing ? 'Editar moto' : 'Nova moto'}</DialogTitle>
        <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Apelido"
                  required
                  fullWidth
                  autoFocus
                  {...register('nickname')}
                  error={Boolean(errors.nickname)}
                  helperText={errors.nickname?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Marca" fullWidth {...register('brand')} error={Boolean(errors.brand)} helperText={errors.brand?.message} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Modelo"
                  required
                  fullWidth
                  {...register('model')}
                  error={Boolean(errors.model)}
                  helperText={errors.model?.message}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Ano"
                  fullWidth
                  inputProps={{ inputMode: 'numeric' }}
                  {...register('modelYear')}
                  error={Boolean(errors.modelYear)}
                  helperText={errors.modelYear?.message}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Placa" fullWidth {...register('plate')} error={Boolean(errors.plate)} helperText={errors.plate?.message} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Hodômetro inicial"
                  required
                  fullWidth
                  inputProps={{ inputMode: 'numeric' }}
                  InputProps={{ endAdornment: <Typography color="text.secondary">km</Typography> }}
                  {...register('initialOdometerKm')}
                  error={Boolean(errors.initialOdometerKm)}
                  helperText={errors.initialOdometerKm?.message ?? 'Km que a moto já tinha ao ser cadastrada'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Capacidade do tanque (L)"
                  fullWidth
                  inputProps={{ inputMode: 'decimal' }}
                  {...register('tankCapacityLiters')}
                  error={Boolean(errors.tankCapacityLiters)}
                  helperText={errors.tankCapacityLiters?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                      label="Moto ativa"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="inherit" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Salvar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        title="Excluir moto"
        message={`Excluir "${toDelete?.nickname ?? ''}" apaga também todos os abastecimentos, trocas de óleo e leituras de hodômetro dela. Esta ação não pode ser desfeita.`}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </Box>
  );
};

export default MotosTab;

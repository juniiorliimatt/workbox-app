import { FC, useMemo, useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { DeleteOutline as DeleteIcon, Save as SaveIcon } from '@mui/icons-material';
import ConfirmDialog from '@/components/ConfirmDialog';
import { CarSetupDTO, CarSetupFieldDTO, CarSetupRequest, SetupRange } from '@/interfaces/forza';

/** Títulos das guias, na ordem do menu do jogo (os ids são os das guias de tuning). */
const GUIDE_TITLE: Record<string, string> = {
  pneus: 'Pneus',
  cambio: 'Câmbio',
  alinhamento: 'Alinhamento',
  barras: 'Barras anti-rolagem',
  molas: 'Molas',
  amortecimento: 'Amortecimento',
  aerodinamica: 'Aerodinâmica',
  freios: 'Freios',
  diferencial: 'Diferencial',
};

const MAX_GEARS = 10;
const DEFAULT_GEAR_LIMITS = { min: 0.48, max: 6 };
const REQUIRED = 'Obrigatório.';

const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const withUnit = (text: string, unit: string) => (!unit ? text : unit === '°' || unit === '%' ? `${text}${unit}` : `${text} ${unit}`);
const limitsText = (min: number, max: number, unit: string) => withUnit(`${fmt(min)} a ${fmt(max)}`, unit);

type RangeText = { min: string; max: string };

const toNumber = (text: string): number | null => {
  if (text.trim() === '') return null;
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Intervalo do slider válido (números e mínimo < máximo), ou nulo. */
const validRange = (range: RangeText | undefined): SetupRange | null => {
  const min = range ? toNumber(range.min) : null;
  const max = range ? toNumber(range.max) : null;
  return min !== null && max !== null && min < max ? { min, max } : null;
};

interface Props {
  setup: CarSetupDTO;
  saving: boolean;
  onSave: (request: CarSetupRequest) => void;
  onDelete: () => void;
}

/**
 * Formulário do setup atual do carro (valores que o Data Out não traz). Os limites do jogo vêm do serviço; molas e
 * aerodinâmica pedem também o mín/máx do slider do carro. O câmbio gera um campo por marcha. Rascunho (`!confirmed`) vem
 * pré-preenchido com a receita inicial: a coleta só começa quando o usuário confere e aceita.
 */
const SetupForm: FC<Props> = ({ setup, saving, onSave, onDelete }) => {
  const [gearCount, setGearCount] = useState(String(setup.gearCount));
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(setup.values).map(([k, v]) => [k, String(v)])));
  const [ranges, setRanges] = useState<Record<string, RangeText>>(() =>
    Object.fromEntries(Object.entries(setup.ranges).map(([k, r]) => [k, { min: String(r.min), max: String(r.max) }])),
  );
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const gearsNumber = Number(gearCount);
  const gearsValid = Number.isInteger(gearsNumber) && gearsNumber >= 1 && gearsNumber <= MAX_GEARS;

  const fields = useMemo<CarSetupFieldDTO[]>(() => {
    const template = setup.fields.find((f) => f.key === 'gear_1');
    const gearField = (n: number): CarSetupFieldDTO => ({
      key: `gear_${n}`,
      guide: 'cambio',
      label: `Relação da ${n}ª marcha`,
      axle: 'NONE',
      unit: '',
      min: template?.min ?? DEFAULT_GEAR_LIMITS.min,
      max: template?.max ?? DEFAULT_GEAR_LIMITS.max,
      perCar: false,
    });
    const gears = gearsValid ? Array.from({ length: gearsNumber }, (_, i) => gearField(i + 1)) : [];
    return setup.fields
      .filter((f) => !f.key.startsWith('gear_'))
      .flatMap((f) => (f.key === 'final_drive' ? [f, ...gears] : [f]));
  }, [setup.fields, gearsNumber, gearsValid]);

  const fieldError = (field: CarSetupFieldDTO): string | null => {
    const n = toNumber(values[field.key] ?? '');
    if (n === null) return (values[field.key] ?? '').trim() === '' ? REQUIRED : 'Número inválido.';
    const bounds = field.perCar ? validRange(ranges[field.key]) : { min: field.min ?? 0, max: field.max ?? 0 };
    if (bounds && (n < bounds.min || n > bounds.max)) return `Deve estar entre ${fmt(bounds.min)} e ${fmt(bounds.max)}.`;
    return null;
  };

  const rangeError = (field: CarSetupFieldDTO): string | null => {
    const range = ranges[field.key];
    if (!range || toNumber(range.min) === null || toNumber(range.max) === null) return REQUIRED;
    return validRange(range) ? null : 'O mínimo deve ser menor que o máximo.';
  };

  const hasErrors = !gearsValid || fields.some((f) => fieldError(f) !== null || (f.perCar && rangeError(f) !== null));
  const shown = (key: string, message: string | null) => (message && (message !== REQUIRED || touched.has(key)) ? message : null);
  const touch = (key: string) => setTouched((prev) => new Set(prev).add(key));

  const groups = useMemo(() => {
    const byGuide = new Map<string, CarSetupFieldDTO[]>();
    fields.forEach((f) => byGuide.set(f.guide, [...(byGuide.get(f.guide) ?? []), f]));
    return [...byGuide.entries()];
  }, [fields]);

  const submit = () => {
    const request: CarSetupRequest = { gearCount: gearsNumber, values: {}, ranges: {} };
    fields.forEach((f) => {
      request.values[f.key] = Number(toNumber(values[f.key] ?? ''));
      const range = f.perCar ? validRange(ranges[f.key]) : null;
      if (range) request.ranges[f.key] = range;
    });
    onSave(request);
  };

  return (
    <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); if (!hasErrors && !saving) submit(); }} aria-label="Setup do carro">
      {setup.confirmed ? (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 2 }}>
          Mudar qualquer valor reinicia a coleta: as amostras anteriores são de outro setup. Salvar sem mudar nada não mexe nela.
        </Typography>
      ) : (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Confira os valores abaixo (receita inicial), preencha o que falta e aceite: a coleta de amostras só começa depois disso.
        </Alert>
      )}

      {groups.map(([guide, guideFields]) => (
        <Paper key={guide} component="section" aria-labelledby={`grupo-${guide}`} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Typography id={`grupo-${guide}`} variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 1.5 }}>
            {GUIDE_TITLE[guide] ?? guide}
          </Typography>
          {guide === 'cambio' && (
            <TextField
              label="Quantidade de marchas"
              type="number"
              size="small"
              value={gearCount}
              onChange={(e) => setGearCount(e.target.value)}
              error={!gearsValid}
              helperText={gearsValid ? `1 a ${MAX_GEARS}` : `Informe de 1 a ${MAX_GEARS} marchas.`}
              inputProps={{ step: 1 }}
              sx={{ width: 220, mb: 2 }}
            />
          )}
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
            {guideFields.map((field) => {
              const error = shown(field.key, fieldError(field));
              // A altura do solo fica sempre no máximo (baixar o carro faz o jogo perder velocidade): só avisa, não bloqueia.
              const heightRange = field.key.startsWith('ride_height') ? validRange(ranges[field.key]) : null;
              const heightValue = toNumber(values[field.key] ?? '');
              const belowMax = heightRange !== null && heightValue !== null && heightValue < heightRange.max;
              const limits = field.perCar
                ? belowMax
                  ? 'Abaixo do máximo: baixar o carro faz o jogo perder velocidade.'
                  : 'Dentro do intervalo do slider do carro'
                : limitsText(field.min ?? 0, field.max ?? 0, field.unit);
              return (
                <Box key={field.key} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField
                    label={field.label}
                    type="number"
                    size="small"
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    onBlur={() => touch(field.key)}
                    error={error !== null}
                    helperText={error ?? limits}
                    inputProps={{ step: 'any' }}
                    required
                  />
                  {field.perCar && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {(['min', 'max'] as const).map((edge) => (
                        <TextField
                          key={edge}
                          label={`${field.label} — ${edge === 'min' ? 'mínimo' : 'máximo'} do slider`}
                          type="number"
                          size="small"
                          value={ranges[field.key]?.[edge] ?? ''}
                          onChange={(e) => setRanges((prev) => ({ ...prev, [field.key]: { min: prev[field.key]?.min ?? '', max: prev[field.key]?.max ?? '', [edge]: e.target.value } }))}
                          onBlur={() => touch(`${field.key}.${edge}`)}
                          error={shown(`${field.key}.${edge}`, rangeError(field)) !== null}
                          helperText={edge === 'max' ? shown(`${field.key}.${edge}`, rangeError(field)) ?? ' ' : ' '}
                          inputProps={{ step: 'any' }}
                          required
                          fullWidth
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Paper>
      ))}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={hasErrors || saving} aria-describedby={hasErrors ? 'setup-hint' : undefined}>
          {setup.confirmed ? 'Salvar setup' : 'Aceitar e iniciar coleta'}
        </Button>
        {setup.confirmed && (
          <Button color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmDelete(true)} disabled={saving}>
            Apagar setup
          </Button>
        )}
        {hasErrors && (
          <Typography id="setup-hint" variant="caption" color="text.secondary">
            Preencha todos os campos com valores dentro dos limites para salvar.
          </Typography>
        )}
      </Box>

      <ConfirmDialog
        open={confirmDelete}
        title="Apagar o setup deste carro?"
        message="O carro volta ao rascunho e nenhuma sessão conta até você aceitar um setup de novo."
        confirmColor="warning"
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Box>
  );
};

export default SetupForm;

import dayjs from 'dayjs';
import { FuelType, OilLevel, OilType } from '@/interfaces/moto';
import { formatCurrency } from '@/utils/format';

const EMPTY = '—';

const number = (value: number, decimals = 0): string =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** `1.234 km`; ausência vira "—". */
export const formatKm = (km: number | null | undefined): string => (km === null || km === undefined ? EMPTY : `${number(km)} km`);

/** `37,50 km/l`; ausência vira "—". */
export const formatKmPerLiter = (value: number | null | undefined): string =>
  value === null || value === undefined ? EMPTY : `${number(value, 2)} km/l`;

/** `R$ 6,33/L`; ausência vira "—". */
export const formatPerLiter = (value: number | null | undefined): string =>
  value === null || value === undefined ? EMPTY : `${formatCurrency(value)}/L`;

export const formatLiters = (liters: number): string => `${number(liters, 2)} L`;

/** Variação com sinal explícito (`+8,20%`, `−13,64%`); ausência vira "—". */
export const formatPct = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return EMPTY;
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${number(Math.abs(value), 2)}%`;
};

/** `YYYY-MM-DD` → `DD/MM/AAAA`. */
export const formatDate = (iso: string): string => dayjs(iso).format('DD/MM/YYYY');

export const FUEL_TYPE_LABEL: Record<FuelType, string> = {
  GASOLINA_COMUM: 'Gasolina comum',
  GASOLINA_ADITIVADA: 'Gasolina aditivada',
  ETANOL: 'Etanol',
};

export const OIL_TYPE_LABEL: Record<OilType, string> = {
  MINERAL: 'Mineral',
  SEMI_SYNTHETIC: 'Semissintético',
  SYNTHETIC: 'Sintético',
};

export const OIL_LEVEL_LABEL: Record<OilLevel, string> = {
  OK: 'Em dia',
  PERTO: 'Troca próxima',
  VENCIDA: 'Troca vencida',
};

/**
 * DTOs do moto-service. Contrato: moto-service/openapi/openapi.yaml — nomes e formatos idênticos aos de lá
 * (BigDecimal chega como `number`; datas como `YYYY-MM-DD`).
 */

export type FuelType = 'GASOLINA_COMUM' | 'GASOLINA_ADITIVADA' | 'ETANOL';
export type OilType = 'MINERAL' | 'SEMI_SYNTHETIC' | 'SYNTHETIC';
export type OilLevel = 'OK' | 'PERTO' | 'VENCIDA';
/** O que vence primeiro, proporcionalmente ao intervalo: os km ou o tempo. */
export type OilLimit = 'KM' | 'TIME';

export interface IMotorcycle {
  id: string;
  nickname: string;
  brand: string | null;
  model: string;
  modelYear: number | null;
  plate: string | null;
  initialOdometerKm: number;
  tankCapacityLiters: number | null;
  active: boolean;
}

export interface IMotorcycleRequest {
  nickname: string;
  brand?: string | null;
  model: string;
  modelYear?: number | null;
  plate?: string | null;
  initialOdometerKm: number;
  tankCapacityLiters?: number | null;
  active?: boolean;
}

export interface IRefueling {
  id: string;
  date: string;
  /** Hodômetro total da moto (não o trip). */
  odometerKm: number;
  liters: number;
  totalValue: number;
  /** valor total / litros (3 casas). */
  pricePerLiter: number;
  station: string | null;
  fuelType: FuelType;
  fullTank: boolean;
}

export interface IRefuelingRequest {
  date: string;
  odometerKm: number;
  liters: number;
  totalValue: number;
  station?: string | null;
  fuelType: FuelType;
  fullTank?: boolean;
}

export interface IPageMetadata {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface IRefuelingPage {
  content: IRefueling[];
  page: IPageMetadata;
}

export interface IOilChange {
  id: string;
  date: string;
  odometerKm: number;
  oilType: OilType;
  brand: string | null;
  viscosity: string | null;
  cost: number | null;
  intervalKm: number;
  intervalMonths: number;
}

export interface IOilChangeRequest {
  date: string;
  odometerKm: number;
  oilType: OilType;
  brand?: string | null;
  viscosity?: string | null;
  cost?: number | null;
  intervalKm: number;
  intervalMonths: number;
}

/** Intervalo de troca sugerido por tipo de óleo — só pré-preenche o formulário. */
export interface IOilInterval {
  type: OilType;
  defaultKm: number;
  minKm: number;
  maxKm: number;
  defaultMonths: number;
}

/**
 * Próxima troca. Moto que nunca trocou óleo: `lastChange` e os campos de vencimento nulos (só o hodômetro atual vem).
 * Restantes negativos = vencida há tantos km/dias.
 */
export interface IOilStatus {
  lastChange: IOilChange | null;
  currentOdometerKm: number;
  dueDate: string | null;
  dueKm: number | null;
  kmRemaining: number | null;
  daysRemaining: number | null;
  level: OilLevel | null;
  limitedBy: OilLimit | null;
}

/** Métricas de um período. km/l e custo por km são ponderados (Σkm / Σlitros); `lowConfidence` = menos de 3 trechos. */
export interface IStats {
  from: string;
  to: string;
  km: number;
  kmPerDay: number;
  litersRefueled: number;
  totalSpent: number;
  pricePerLiter: number | null;
  kmPerLiter: number | null;
  costPerKm: number | null;
  segmentCount: number;
  lowConfidence: boolean;
  bestKmPerLiter: number | null;
  worstKmPerLiter: number | null;
  longestSegmentKm: number | null;
}

export interface IMonthlyStats {
  year: number;
  month: number;
  stats: IStats;
  /** Variação do gasto contra o mês anterior do mesmo ano; nula em janeiro ou sem base de comparação. */
  spentChangePct: number | null;
}

export interface IYearlyStats {
  year: number;
  stats: IStats;
}

export interface IOdometerReadingRequest {
  date: string;
  odometerKm: number;
}

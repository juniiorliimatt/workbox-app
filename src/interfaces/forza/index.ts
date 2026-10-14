/**
 * Tipos do forza-telemetry-service (porta 7057).
 * Fonte: forza-telemetry-service/openapi/openapi.yaml. O `summary` é um objeto livre no
 * contrato (additionalProperties), então `TuningSummary` espelha o que o
 * `SummaryCalculator` do serviço produz — ajustar aqui se o serviço mudar.
 */

export type Wheel = 'FL' | 'FR' | 'RL' | 'RR';

export interface SessionDTO {
  id: string;
  gameFormat: string;
  carOrdinal: number;
  /** Nome exato do carro (catálogo do serviço); ausente quando o ordinal não é conhecido. */
  carName?: string | null;
  carClass: number;
  performanceIndex: number;
  drivetrain: 'FWD' | 'RWD' | 'AWD' | 'UNKNOWN' | string;
  cylinders: number;
  trackOrdinal?: number | null;
  startedAt: string;
  endedAt?: string | null;
  sampleCount: number;
  active: boolean;
  /** As amostras brutas foram apagadas ao reiniciar a coleta do carro (resumo e voltas continuam). */
  samplesPurged?: boolean;
}

export interface SessionPageDTO {
  items: SessionDTO[];
  nextCursor?: string | null;
}

export interface LapDTO {
  lapNumber: number;
  lapTimeS: number;
}

/** Rodas sempre na ordem [FL, FR, RL, RR]. */
export interface SampleDTO {
  tMs: number;
  lapNumber: number;
  rpm: number;
  speed: number;
  power: number;
  torque: number;
  boost: number;
  gear: number;
  accel: number;
  brake: number;
  steer: number;
  accelX: number;
  accelZ: number;
  posX: number;
  posZ: number;
  onRumble: boolean;
  suspension: number[];
  slipRatio: number[];
  slipAngle: number[];
  combinedSlip: number[];
  tireTemp: number[];
  tireWear?: number[] | null;
}

export interface LiveSnapshotDTO {
  receivedAt: string;
  gameFormat: string;
  raceOn: boolean;
  carOrdinal: number;
  carName?: string | null;
  performanceIndex: number;
  rpm: number;
  engineMaxRpm: number;
  speedKmh?: number | null;
  gear?: number | null;
  accel?: number | null;
  brake?: number | null;
  steer?: number | null;
  suspension: number[];
  slipAngle: number[];
  combinedSlip: number[];
  tireTempF?: number[] | null;
  lapNumber?: number | null;
  currentLapS?: number | null;
  lastLapS?: number | null;
  bestLapS?: number | null;
}

export interface SuspensionWheelStats {
  mean: number;
  p95: number;
  bottomingPct: number;
  toppingPct: number;
}

export interface CornerPhaseStats {
  samples: number;
  frontSlipAngleMean?: number;
  rearSlipAngleMean?: number;
  understeerPct?: number;
  oversteerPct?: number;
}

export interface GearStats {
  timePct: number;
  rpmP50: number;
  limiterWithThrottlePct: number;
}

export interface TireWheelStats {
  tempMeanF: number;
  tempP95F: number;
  wearFinal?: number;
}

/** Sessões sem amostras trazem só `samples` e `durationS`. */
export interface TuningSummary {
  samples: number;
  durationS: number;
  suspension?: Record<Wheel, SuspensionWheelStats>;
  speedKmh?: { max: number; meanMoving: number };
  engine?: {
    maxRpm: number;
    peakPowerHp: number;
    peakPowerRpm: number;
    peakTorqueNm: number;
    peakTorqueRpm: number;
    boostMaxPsi: number;
    gears: Record<string, GearStats>;
  };
  tires?: Record<Wheel, TireWheelStats>;
  cornerBalance?: {
    entry: CornerPhaseStats;
    mid: CornerPhaseStats;
    exit: CornerPhaseStats;
    note?: string;
  };
  braking?: { samples: number; frontLockPct: number; rearLockPct: number };
  traction?: {
    samples: number;
    drivenWheelSpinPct: number;
    spinPctByGear: Record<string, number>;
  };
  laps?: { times: { lap: number; timeS: number }[]; bestS: number | null };
  onRumbleStripPct?: number;
}

/** `GET /api/v1/live/info` — onde apontar o Data Out do jogo. `hostAddresses` vazio = não configurado no serviço. */
export interface LiveInfoDTO {
  hostAddresses: string[];
  udpPort: number;
}

/** Classe de PI do FH6 (D 100–400, C 401–500, B 501–600, A 601–700, S1 701–800, S2 801–900, R 901–998): cada classe é uma build. */
export type PerformanceClass = 'D' | 'C' | 'B' | 'A' | 'S1' | 'S2' | 'R';

/** `GET /api/v1/tuning/cars` — um carro numa classe de PI, com sessões coletadas e o progresso até poder recomendar. */
export interface TuningCarDTO {
  carOrdinal: number;
  carName?: string | null;
  carClass: number;
  performanceIndex: number;
  performanceClass: PerformanceClass;
  drivetrain: string;
  sessions: number;
  samples: number;
  requiredSessions: number;
  requiredSamples: number;
  /** Nível inicial atingido: libera a recomendação. */
  ready: boolean;
  /** Nível de ajuste fino atingido (só se `ready`): `highRequiredSessions` sessões e `highRequiredSamples` amostras. */
  highConfidence: boolean;
  highRequiredSessions: number;
  highRequiredSamples: number;
  lastSessionAt: string;
  /** Sessão sendo gravada agora nessa build (ainda não conta no progresso), ou nula. */
  activeSession?: TuningActiveSessionDTO | null;
  /** Setup do carro conferido e aceito: só então a coleta conta sessões (sem ele, `sessions` é 0). */
  setupConfirmed?: boolean;
}

export interface TuningActiveSessionDTO {
  samples: number;
  targetSamples: number;
  startedAt: string;
}

export interface TuningReadinessDTO {
  ready: boolean;
  sessions: number;
  requiredSessions: number;
  samples: number;
  requiredSamples: number;
  /** Nível de ajuste fino atingido (só se `ready`). `missing` descreve só o nível inicial. */
  highConfidence: boolean;
  highRequiredSessions: number;
  highRequiredSamples: number;
  missing: string[];
}

export type TuningAxle = 'FRONT' | 'REAR' | 'BOTH' | 'NONE';
export type TuningDirection = 'INCREASE' | 'DECREASE';
export type TuningGuideStatus = 'ADJUST' | 'OK' | 'NO_SIGNAL';

export interface TuningSuggestionDTO {
  priority: number;
  thisCycle: boolean;
  guide: string;
  parameter: string;
  axle: TuningAxle;
  direction: TuningDirection;
  rationale: string;
  evidence: string;
  /** Tamanho do passo deste ciclo (não o valor final: o Data Out não traz o setup), na unidade `unit`. Nulo em fotos antigas. */
  amount?: number | null;
  unit?: string | null;
  magnitude?: 'SMALL' | 'MEDIUM' | 'LARGE' | null;
  /** Campo do setup do carro que a sugestão mexe; nulo sem setup aceito ou sem campo correspondente (ex.: altura do solo). */
  setupKey?: string | null;
  /** Valor atual informado pelo usuário e valor-alvo (`atual ± passo`, travado no mín/máx do jogo). */
  current?: number | null;
  target?: number | null;
  /** O valor atual já está no limite na direção sugerida: não dá para ir além. */
  atLimit?: boolean;
}

export interface TuningGuideDTO {
  id: string;
  title: string;
  status: TuningGuideStatus;
  summary: string;
  notes: string[];
  suggestions: TuningSuggestionDTO[];
}

/** `GET /api/v1/tuning/history` — um tuning salvo (foto gravada ao reiniciar a coleta do carro com recomendação pronta). */
export interface TuningHistoryItemDTO {
  id: string;
  carOrdinal: number;
  carName?: string | null;
  carClass: number;
  performanceIndex: number;
  performanceClass: PerformanceClass;
  drivetrain: string;
  savedAt: string;
  windowFrom: string;
  windowTo: string;
  sessions: number;
  samples: number;
  adjustments: number;
}

/** `GET /api/v1/tuning/history/{id}` — a recomendação como estava quando foi salva. */
export interface TuningHistoryDTO {
  id: string;
  savedAt: string;
  recommendation: TuningRecommendationDTO;
}

/** Um parâmetro da configuração inicial: `front`/`rear` quando há um valor por eixo; `value` para valor único ou receita em texto. */
export interface TuningSetupItemDTO {
  parameter: string;
  front?: string | null;
  rear?: string | null;
  value?: string | null;
  note?: string | null;
}

/** Grupo da configuração inicial; o `id` é o da guia de tuning (pneus, cambio, molas...). */
export interface TuningSetupGroupDTO {
  id: string;
  title: string;
  items: TuningSetupItemDTO[];
}

/** `GET /api/v1/tuning/cars/{carOrdinal}/{performanceClass}`. `guides` vem vazio enquanto `readiness.ready` for falso. */
export interface TuningRecommendationDTO {
  carOrdinal: number;
  carName?: string | null;
  carClass: number;
  performanceIndex: number;
  performanceClass: PerformanceClass;
  drivetrain: string;
  readiness: TuningReadinessDTO;
  windowFrom?: string | null;
  windowTo?: string | null;
  checkpointAt?: string | null;
  guides: TuningGuideDTO[];
  thisCycle: TuningSuggestionDTO[];
  /** Configuração inicial (ponto de partida do desenvolvedor); ausente/vazia em fotos do histórico. */
  initialSetup?: TuningSetupGroupDTO[] | null;
  /** Setup do carro conferido e aceito pelo usuário: só então a coleta conta sessões e as sugestões trazem atual → alvo. Ausente em fotos antigas. */
  setupConfirmed?: boolean;
}

/** Um campo do formulário de setup, com os limites do jogo; `min`/`max` são nulos em molas e aerodinâmica (`perCar`), cujo intervalo o usuário informa. */
export interface CarSetupFieldDTO {
  key: string;
  guide: string;
  label: string;
  axle: 'FRONT' | 'REAR' | 'NONE';
  unit: string;
  min?: number | null;
  max?: number | null;
  perCar: boolean;
}

export interface SetupRange {
  min: number;
  max: number;
}

/** `GET /api/v1/tuning/cars/{carOrdinal}/{performanceClass}/setup` — `confirmed = false` é o rascunho da receita inicial, ainda não salvo. */
export interface CarSetupDTO {
  confirmed: boolean;
  gearCount: number;
  values: Record<string, number>;
  ranges: Record<string, SetupRange>;
  fields: CarSetupFieldDTO[];
  confirmedAt?: string | null;
}

/** Corpo do `PUT .../setup`. */
export interface CarSetupRequest {
  gearCount: number;
  values: Record<string, number>;
  ranges: Record<string, SetupRange>;
}

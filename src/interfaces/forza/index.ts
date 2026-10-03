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

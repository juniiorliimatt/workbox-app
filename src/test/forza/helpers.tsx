import { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContextValue';
import { SnackbarProvider } from '@/contexts/SnackbarContext';
import { IAuthContext } from '@/interfaces/IAuthContext';
import { SessionDTO, TuningCarDTO, TuningGuideDTO, TuningHistoryItemDTO, TuningRecommendationDTO, TuningSummary } from '@/interfaces/forza';

export const createAuthValue = (overrides?: Partial<IAuthContext>): IAuthContext => ({
  accessToken: 'mock-access-token',
  user: { id: '1', socialName: 'Usuário QA', email: 'qa.user@workbox.local', enabled: true, roles: ['ROLE_USER'] },
  isAuthenticated: true,
  isAdmin: false,
  isLoading: false,
  mfaRequired: false,
  mfaToken: null,
  login: vi.fn().mockResolvedValue(undefined),
  loginMfa: vi.fn().mockResolvedValue(undefined),
  registerUser: vi.fn().mockResolvedValue({ id: '1', socialName: 'u', email: 'e@test.com', enabled: true }),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  uploadAvatar: vi.fn().mockResolvedValue(undefined),
  deleteAvatar: vi.fn().mockResolvedValue(undefined),
  changePassword: vi.fn().mockResolvedValue(undefined),
  enrollMfa: vi.fn().mockResolvedValue({ secret: 'mock', otpAuthUri: 'mock' }),
  verifyMfa: vi.fn().mockResolvedValue(undefined),
  disableMfa: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn().mockResolvedValue(null),
  logout: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

/** Renderiza a página dentro de Auth + Snackbar + Router, na rota informada (com :params). */
export const renderAt = (ui: ReactElement, { path, route }: { path: string; route: string }) =>
  render(
    <AuthContext.Provider value={createAuthValue()}>
      <SnackbarProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </MemoryRouter>
      </SnackbarProvider>
    </AuthContext.Provider>,
  );

export const makeSession = (overrides?: Partial<SessionDTO>): SessionDTO => ({
  id: '11111111-1111-1111-1111-111111111111',
  gameFormat: 'FH4/FH5/FH6',
  carOrdinal: 1234,
  carName: null,
  carClass: 4,
  performanceIndex: 812,
  drivetrain: 'AWD',
  cylinders: 8,
  trackOrdinal: null,
  startedAt: '2026-10-03T12:00:00Z',
  endedAt: '2026-10-03T12:10:00Z',
  sampleCount: 12000,
  active: false,
  ...overrides,
});

export const makeSummary = (overrides?: Partial<TuningSummary>): TuningSummary => ({
  samples: 12000,
  durationS: 600,
  suspension: {
    FL: { mean: 0.5, p95: 0.8, bottomingPct: 2.5, toppingPct: 0.1 },
    FR: { mean: 0.5, p95: 0.8, bottomingPct: 0, toppingPct: 0 },
    RL: { mean: 0.4, p95: 0.7, bottomingPct: 0, toppingPct: 0 },
    RR: { mean: 0.4, p95: 0.7, bottomingPct: 0, toppingPct: 0 },
  },
  speedKmh: { max: 288.4, meanMoving: 140.2 },
  engine: {
    maxRpm: 8000,
    peakPowerHp: 650.5,
    peakPowerRpm: 7200,
    peakTorqueNm: 700,
    peakTorqueRpm: 5500,
    boostMaxPsi: 14.2,
    gears: { '3': { timePct: 60, rpmP50: 6000, limiterWithThrottlePct: 12.5 } },
  },
  tires: {
    FL: { tempMeanF: 194, tempP95F: 212, wearFinal: 0.123 },
    FR: { tempMeanF: 194, tempP95F: 212 },
    RL: { tempMeanF: 176, tempP95F: 190 },
    RR: { tempMeanF: 176, tempP95F: 190 },
  },
  cornerBalance: {
    entry: { samples: 100, frontSlipAngleMean: 0.8, rearSlipAngleMean: 0.2, understeerPct: 70, oversteerPct: 5 },
    mid: { samples: 0 },
    exit: { samples: 50, frontSlipAngleMean: 0.1, rearSlipAngleMean: 0.7, understeerPct: 0, oversteerPct: 55 },
  },
  braking: { samples: 300, frontLockPct: 8.5, rearLockPct: 1.2 },
  traction: { samples: 400, drivenWheelSpinPct: 22.5, spinPctByGear: { '2': 40, '3': 10 } },
  laps: { times: [{ lap: 1, timeS: 62.5 }], bestS: 62.5 },
  onRumbleStripPct: 3.2,
  ...overrides,
});

export const makeTuningCar = (overrides?: Partial<TuningCarDTO>): TuningCarDTO => ({
  carOrdinal: 3667,
  carName: '2021 Porsche 911 GT3',
  carClass: 4,
  performanceIndex: 812,
  performanceClass: 'S2',
  drivetrain: 'RWD',
  sessions: 12,
  samples: 14000,
  requiredSessions: 10,
  requiredSamples: 50000,
  ready: true,
  lastSessionAt: '2026-10-10T12:00:00Z',
  activeSession: null,
  ...overrides,
});

export const makeTuningHistoryItem = (overrides?: Partial<TuningHistoryItemDTO>): TuningHistoryItemDTO => ({
  id: '22222222-2222-2222-2222-222222222222',
  carOrdinal: 1105,
  carName: '1964 Aston Martin DB5 Vantage',
  carClass: 3,
  performanceIndex: 700,
  performanceClass: 'A',
  drivetrain: 'RWD',
  savedAt: '2026-10-03T19:50:00Z',
  windowFrom: '2026-10-03T19:02:00Z',
  windowTo: '2026-10-03T19:28:00Z',
  sessions: 12,
  samples: 30523,
  adjustments: 2,
  ...overrides,
});

const GUIDE_TITLES: [string, string][] = [
  ['pneus', 'Pneus'],
  ['cambio', 'Câmbio'],
  ['alinhamento', 'Alinhamento'],
  ['barras', 'Barras anti-rolagem'],
  ['molas', 'Molas'],
  ['amortecimento', 'Amortecimento'],
  ['aerodinamica', 'Aerodinâmica'],
  ['freios', 'Freios'],
  ['diferencial', 'Diferencial'],
];

export const makeGuides = (overrides?: Record<string, Partial<TuningGuideDTO>>): TuningGuideDTO[] =>
  GUIDE_TITLES.map(([id, title]) => ({
    id,
    title,
    status: id === 'aerodinamica' ? 'NO_SIGNAL' : 'OK',
    summary: id === 'aerodinamica' ? 'A telemetria não separa comportamento em alta velocidade.' : `${title} dentro do esperado.`,
    notes: [],
    suggestions: [],
    ...overrides?.[id],
  }));

export const makeRecommendation = (overrides?: Partial<TuningRecommendationDTO>): TuningRecommendationDTO => {
  const suggestion = {
    priority: 1,
    thisCycle: true,
    guide: 'molas',
    parameter: 'Altura do solo traseira',
    axle: 'REAR' as const,
    direction: 'INCREASE' as const,
    rationale: 'A suspensão está batendo no limite de curso.',
    evidence: 'Suspensão traseira no fundo de curso em 7% das amostras (roda RL; limite 3%)',
    amount: 0.5,
    unit: 'cm',
    magnitude: 'SMALL' as const,
  };
  const second = { ...suggestion, priority: 2, guide: 'pneus', parameter: 'Pressão dos pneus traseiros', direction: 'DECREASE' as const, rationale: 'Pneu superaquecido perde aderência.', evidence: 'Temperatura média do eixo traseiro: 225 °F (máximo aceitável 210 °F)', amount: 0.3, unit: 'bar', magnitude: 'LARGE' as const };
  return {
    carOrdinal: 3667,
    carName: '2021 Porsche 911 GT3',
    carClass: 4,
    performanceIndex: 812,
    performanceClass: 'S2',
    drivetrain: 'RWD',
    readiness: { ready: true, sessions: 12, requiredSessions: 10, samples: 14000, requiredSamples: 6000, missing: [] },
    windowFrom: '2026-10-01T10:00:00Z',
    windowTo: '2026-10-10T12:00:00Z',
    checkpointAt: null,
    guides: makeGuides({
      molas: { status: 'ADJUST', summary: '1 ajuste sugerido', suggestions: [suggestion] },
      pneus: { status: 'ADJUST', summary: '1 ajuste sugerido', suggestions: [second] },
    }),
    thisCycle: [suggestion, second],
    ...overrides,
  };
};

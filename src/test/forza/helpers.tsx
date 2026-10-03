import { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContextValue';
import { SnackbarProvider } from '@/contexts/SnackbarContext';
import { IAuthContext } from '@/interfaces/IAuthContext';
import { SessionDTO, TuningSummary } from '@/interfaces/forza';

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

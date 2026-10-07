import { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { AuthContext } from '@/contexts/AuthContextValue';
import { SnackbarProvider } from '@/contexts/SnackbarContext';
import {
  IMonthlyStats,
  IMotorcycle,
  IOilChange,
  IOilInterval,
  IOilStatus,
  IRefueling,
  IRefuelingPage,
  IStats,
} from '@/interfaces/moto';
import { createAuthValue } from '../forza/helpers';

/** Renderiza dentro de Auth + Snackbar + pt-BR do DatePicker + Router (como o `App.tsx`). */
export const renderMoto = (ui: ReactElement, route = '/moto') =>
  render(
    <AuthContext.Provider value={createAuthValue()}>
      <SnackbarProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </LocalizationProvider>
      </SnackbarProvider>
    </AuthContext.Provider>,
  );

/** `toLocaleString` de moeda usa espaço não separável (U+00A0); normaliza pra comparar com texto simples. */
export const plain = (text: string | null): string => (text ?? '').replace(/\u00a0/g, ' ');

/** Falha alto se a tela pedir uma URL que o teste não previu. */
export const routeGet = (mockGet: { mockImplementation: (fn: (url: string) => Promise<unknown>) => unknown }, routes: Record<string, unknown>) =>
  mockGet.mockImplementation(async (url: string) => {
    if (url in routes) return { data: routes[url] };
    throw new Error(`GET não previsto no teste: ${url}`);
  });

export const MOTO_ID = '11111111-1111-1111-1111-111111111111';

export const makeMotorcycle = (overrides?: Partial<IMotorcycle>): IMotorcycle => ({
  id: MOTO_ID,
  nickname: 'Fazer',
  brand: 'Yamaha',
  model: 'Fazer 250',
  modelYear: 2022,
  plate: 'ABC1D23',
  initialOdometerKm: 1000,
  tankCapacityLiters: 14,
  active: true,
  ...overrides,
});

export const makeRefueling = (overrides?: Partial<IRefueling>): IRefueling => ({
  id: '22222222-2222-2222-2222-222222222222',
  date: '2026-02-10',
  odometerKm: 1500,
  liters: 5,
  totalValue: 32,
  pricePerLiter: 6.4,
  station: 'Posto Shell',
  fuelType: 'GASOLINA_COMUM',
  fullTank: false,
  ...overrides,
});

export const makeRefuelingPage = (content: IRefueling[] = [makeRefueling()], overrides?: Partial<IRefuelingPage['page']>): IRefuelingPage => ({
  content,
  page: { size: 10, number: 0, totalElements: content.length, totalPages: 1, ...overrides },
});

export const makeOilChange = (overrides?: Partial<IOilChange>): IOilChange => ({
  id: '33333333-3333-3333-3333-333333333333',
  date: '2026-06-01',
  odometerKm: 20000,
  oilType: 'SEMI_SYNTHETIC',
  brand: 'Motul',
  viscosity: '10W-40',
  cost: 85,
  intervalKm: 4000,
  intervalMonths: 6,
  ...overrides,
});

export const makeOilStatus = (overrides?: Partial<IOilStatus>): IOilStatus => ({
  lastChange: makeOilChange(),
  currentOdometerKm: 23000,
  dueDate: '2026-12-01',
  dueKm: 24000,
  kmRemaining: 1000,
  daysRemaining: 122,
  level: 'OK',
  limitedBy: 'KM',
  ...overrides,
});

export const OIL_INTERVALS: IOilInterval[] = [
  { type: 'MINERAL', defaultKm: 1500, minKm: 1000, maxKm: 1500, defaultMonths: 6 },
  { type: 'SEMI_SYNTHETIC', defaultKm: 4000, minKm: 3000, maxKm: 4000, defaultMonths: 6 },
  { type: 'SYNTHETIC', defaultKm: 6000, minKm: 5000, maxKm: 6000, defaultMonths: 12 },
];

export const makeStats = (overrides?: Partial<IStats>): IStats => ({
  from: '2026-01-01',
  to: '2026-01-31',
  km: 300,
  kmPerDay: 9.68,
  litersRefueled: 18,
  totalSpent: 110,
  pricePerLiter: 6.111,
  kmPerLiter: 37.5,
  costPerKm: 0.17,
  segmentCount: 3,
  lowConfidence: false,
  bestKmPerLiter: 40,
  worstKmPerLiter: 20,
  longestSegmentKm: 300,
  ...overrides,
});

export const makeMonthly = (year = 2026): IMonthlyStats[] =>
  Array.from({ length: 12 }, (_, i) => ({
    year,
    month: i + 1,
    stats: makeStats({ from: `${year}-${String(i + 1).padStart(2, '0')}-01`, to: `${year}-${String(i + 1).padStart(2, '0')}-28`, km: i < 2 ? 300 + i * 100 : 0, kmPerLiter: i < 2 ? 37.5 - i * 10 : null, totalSpent: i < 2 ? 110 - i * 15 : 0, segmentCount: i < 2 ? 1 : 0, lowConfidence: true }),
    spentChangePct: i === 1 ? -13.64 : null,
  }));

const DASH = '—';

const CAR_CLASSES = ['D', 'C', 'B', 'A', 'S1', 'S2', 'X'];

const DRIVETRAINS: Record<string, string> = {
  FWD: 'Dianteira (FWD)',
  RWD: 'Traseira (RWD)',
  AWD: 'Integral (AWD)',
};

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const pad = (value: number, size = 2) => String(value).padStart(size, '0');

/** Tempo de volta em m:ss.mmm; `—` para ausente, zero, negativo ou inválido. */
export const formatLapTime = (seconds: number | null | undefined): string => {
  if (!isFiniteNumber(seconds) || seconds <= 0) return DASH;
  const totalMs = Math.round(seconds * 1000);
  const minutes = Math.floor(totalMs / 60000);
  const rest = totalMs % 60000;
  return `${minutes}:${pad(Math.floor(rest / 1000))}.${pad(rest % 1000, 3)}`;
};

/** Duração em mm:ss (ou h:mm:ss a partir de uma hora). */
export const formatDuration = (seconds: number | null | undefined): string => {
  const total = isFiniteNumber(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
};

/** Índice de classe do Data Out (0 = D … 6 = X). */
export const carClassLabel = (index: number): string => CAR_CLASSES[index] ?? `Classe ${index}`;

export const describeDrivetrain = (drivetrain: string): string => DRIVETRAINS[drivetrain] ?? 'Desconhecida';

/** O jogo envia temperatura de pneu em °F; a UI mostra °C. */
export const fahrenheitToCelsius = (fahrenheit: number): number => Math.round(((fahrenheit - 32) * 5 * 10) / 9) / 10;

export const formatNumber = (value: number | null | undefined, digits: number): string =>
  isFiniteNumber(value)
    ? value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : DASH;

export const formatPercent = (value: number | null | undefined): string =>
  isFiniteNumber(value) ? `${formatNumber(value, 1)}%` : DASH;

export const formatTemperature = (fahrenheit: number | null | undefined): string =>
  isFiniteNumber(fahrenheit) ? `${formatNumber(fahrenheitToCelsius(fahrenheit), 1)} °C` : DASH;

export const formatSessionStart = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

/** Reduz a série pra no máximo `maxPoints` por passo fixo, preservando primeiro e último ponto. */
export const decimate = <T,>(items: T[], maxPoints: number): T[] => {
  if (items.length <= maxPoints) return items;
  if (maxPoints < 2) return [items[0]];
  const step = (items.length - 1) / (maxPoints - 1);
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i += 1) {
    out.push(items[Math.round(i * step)]);
  }
  return out;
};

const LOOPBACK_HOSTS = new Set(['', 'localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * IP(s) pra configurar no Data Out: os anunciados pelo serviço; se não houver, o host que o
 * navegador usou pra abrir o app (útil quando se acessa pelo IP da LAN). Loopback nunca serve
 * (o console não alcança o `localhost` do PC), então devolve lista vazia.
 */
export const resolveDataOutHosts = (info: { hostAddresses?: unknown; udpPort?: unknown } | null | undefined, browserHostname: string): string[] => {
  const announced = Array.isArray(info?.hostAddresses)
    ? (info.hostAddresses as unknown[]).filter((host): host is string => typeof host === 'string' && host.trim() !== '').map((host) => host.trim())
    : [];
  if (announced.length > 0) return announced;
  return LOOPBACK_HOSTS.has(browserHostname) ? [] : [browserHostname];
};

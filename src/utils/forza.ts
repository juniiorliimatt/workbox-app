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

/** Quantidade de LEDs do shift light (estilo volante de F1). */
export const SHIFT_LED_COUNT = 12;

/** Os LEDs começam a acender em 70% do limite de rotação do carro... */
export const SHIFT_LIGHT_START = 0.7;
/** ...e todos acendem (e piscam: "troque de marcha") a partir de 95%. */
export const SHIFT_LIGHT_SHIFT_AT = 0.95;

/**
 * Estado do shift light a partir da rotação atual e do limite do carro (`EngineMaxRpm` do pacote —
 * cada veículo manda o seu). `lit` = LEDs acesos (0..SHIFT_LED_COUNT); `shiftNow` = hora de subir a
 * marcha. Dado inválido nunca acende nada.
 */
export const shiftLightLevel = (rpm: number, maxRpm: number): { lit: number; shiftNow: boolean } => {
  if (!isFiniteNumber(rpm) || !isFiniteNumber(maxRpm) || maxRpm <= 0 || rpm <= 0) return { lit: 0, shiftNow: false };
  const ratio = rpm / maxRpm;
  if (ratio >= SHIFT_LIGHT_SHIFT_AT) return { lit: SHIFT_LED_COUNT, shiftNow: true };
  const progress = (ratio - SHIFT_LIGHT_START) / (SHIFT_LIGHT_SHIFT_AT - SHIFT_LIGHT_START);
  // O último LED só acende junto com o aviso de troca (shiftNow), nunca antes.
  return { lit: Math.min(SHIFT_LED_COUNT - 1, Math.max(0, Math.ceil(progress * SHIFT_LED_COUNT))), shiftNow: false };
};

/** Nome exato do carro (catálogo do serviço) ou `#ordinal` quando não é conhecido. */
export const carLabel = (name: string | null | undefined, ordinal: number): string => (name && name.trim() !== '' ? name.trim() : `#${ordinal}`);

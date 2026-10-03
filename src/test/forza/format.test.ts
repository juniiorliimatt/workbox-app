import { describe, it, expect } from 'vitest';
import {
  carClassLabel,
  carLabel,
  decimate,
  resolveDataOutHosts,
  shiftLightLevel,
  SHIFT_LED_COUNT,
  describeDrivetrain,
  fahrenheitToCelsius,
  formatDuration,
  formatLapTime,
  formatNumber,
  formatPercent,
  formatSessionStart,
} from '@/utils/forza';

describe('formatLapTime', () => {
  it('formats seconds as m:ss.mmm', () => {
    expect(formatLapTime(62.5)).toBe('1:02.500');
    expect(formatLapTime(59.123)).toBe('0:59.123');
    expect(formatLapTime(125.0005)).toBe('2:05.001');
  });

  it('keeps counting minutes past one hour', () => {
    expect(formatLapTime(3725.5)).toBe('62:05.500');
  });

  it('returns a dash for missing or non-positive times', () => {
    expect(formatLapTime(null)).toBe('—');
    expect(formatLapTime(undefined)).toBe('—');
    expect(formatLapTime(0)).toBe('—');
    expect(formatLapTime(-3)).toBe('—');
    expect(formatLapTime(Number.NaN)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('formats under an hour as mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(723.9)).toBe('12:03');
  });

  it('adds hours when needed', () => {
    expect(formatDuration(3723)).toBe('1:02:03');
  });

  it('treats invalid input as zero', () => {
    expect(formatDuration(-5)).toBe('00:00');
    expect(formatDuration(Number.NaN)).toBe('00:00');
  });
});

describe('carClassLabel', () => {
  it('maps Forza class indexes to letters', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(carClassLabel)).toEqual(['D', 'C', 'B', 'A', 'S1', 'S2', 'X']);
  });

  it('falls back for unknown indexes', () => {
    expect(carClassLabel(9)).toBe('Classe 9');
    expect(carClassLabel(-1)).toBe('Classe -1');
  });
});

describe('carLabel', () => {
  it('prefers the exact car name', () => {
    expect(carLabel('2021 Porsche 911 GT3', 3667)).toBe('2021 Porsche 911 GT3');
  });

  it('falls back to #ordinal when the name is unknown', () => {
    expect(carLabel(null, 3667)).toBe('#3667');
    expect(carLabel(undefined, 3667)).toBe('#3667');
    expect(carLabel('', 3667)).toBe('#3667');
    expect(carLabel('   ', 3667)).toBe('#3667');
  });
});

describe('describeDrivetrain', () => {
  it('describes known drivetrains in Portuguese', () => {
    expect(describeDrivetrain('FWD')).toBe('Dianteira (FWD)');
    expect(describeDrivetrain('RWD')).toBe('Traseira (RWD)');
    expect(describeDrivetrain('AWD')).toBe('Integral (AWD)');
  });

  it('returns a neutral label for unknown values', () => {
    expect(describeDrivetrain('UNKNOWN')).toBe('Desconhecida');
    expect(describeDrivetrain('XYZ')).toBe('Desconhecida');
  });
});

describe('fahrenheitToCelsius', () => {
  it('converts and rounds to one decimal', () => {
    expect(fahrenheitToCelsius(32)).toBe(0);
    expect(fahrenheitToCelsius(212)).toBe(100);
    expect(fahrenheitToCelsius(194)).toBe(90);
    expect(fahrenheitToCelsius(100)).toBe(37.8);
  });
});

describe('formatNumber / formatPercent', () => {
  it('uses pt-BR separators', () => {
    expect(formatNumber(1234.5, 1)).toBe('1.234,5');
    expect(formatNumber(0.5, 2)).toBe('0,50');
  });

  it('appends the percent sign', () => {
    expect(formatPercent(12.34)).toBe('12,3%');
    expect(formatPercent(0)).toBe('0,0%');
  });

  it('returns a dash for missing values', () => {
    expect(formatNumber(null, 1)).toBe('—');
    expect(formatNumber(undefined, 1)).toBe('—');
    expect(formatPercent(undefined)).toBe('—');
  });
});

describe('formatSessionStart', () => {
  it('renders a pt-BR short date and time', () => {
    expect(formatSessionStart('2026-10-03T15:00:00Z')).toMatch(/03\/10\/2026/);
  });

  it('returns a dash for invalid dates', () => {
    expect(formatSessionStart('não é data')).toBe('—');
  });
});

describe('decimate', () => {
  const range = (n: number) => Array.from({ length: n }, (_, i) => i);

  it('returns the same items when already within the limit', () => {
    expect(decimate(range(5), 10)).toEqual([0, 1, 2, 3, 4]);
    expect(decimate(range(10), 10)).toEqual(range(10));
  });

  it('never exceeds the limit and keeps first and last points', () => {
    const out = decimate(range(10000), 1000);

    expect(out.length).toBeLessThanOrEqual(1000);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(9999);
  });

  it('keeps the original order', () => {
    const out = decimate(range(5000), 500);

    expect([...out].sort((a, b) => a - b)).toEqual(out);
  });

  it('handles empty input and tiny limits', () => {
    expect(decimate([], 10)).toEqual([]);
    expect(decimate(range(100), 2)).toEqual([0, 99]);
  });
});

describe('resolveDataOutHosts', () => {
  it('prefers the IPs announced by the service', () => {
    expect(resolveDataOutHosts({ hostAddresses: ['192.168.0.10', '10.0.0.5'], udpPort: 5310 }, '192.168.0.99')).toEqual(['192.168.0.10', '10.0.0.5']);
  });

  it('falls back to the host the browser used to reach the app', () => {
    expect(resolveDataOutHosts({ hostAddresses: [], udpPort: 5310 }, '192.168.0.99')).toEqual(['192.168.0.99']);
    expect(resolveDataOutHosts(null, 'meu-pc.local')).toEqual(['meu-pc.local']);
  });

  it('does not offer a loopback address (useless for the console)', () => {
    for (const host of ['localhost', '127.0.0.1', '::1', '[::1]', '']) {
      expect(resolveDataOutHosts({ hostAddresses: [], udpPort: 5310 }, host)).toEqual([]);
    }
  });

  it('ignores malformed announcements', () => {
    expect(resolveDataOutHosts({ hostAddresses: undefined, udpPort: 5310 } as never, 'localhost')).toEqual([]);
    expect(resolveDataOutHosts({ items: [] } as never, 'localhost')).toEqual([]);
    expect(resolveDataOutHosts({ hostAddresses: ['', '  '], udpPort: 1 }, 'localhost')).toEqual([]);
  });
});

describe('shiftLightLevel', () => {
  it('has no LED lit at low rpm', () => {
    expect(shiftLightLevel(3000, 8000)).toEqual({ lit: 0, shiftNow: false });
    expect(shiftLightLevel(0, 8000)).toEqual({ lit: 0, shiftNow: false });
  });

  it('starts lighting at 70% of the limit and lights progressively', () => {
    expect(shiftLightLevel(5600, 8000).lit).toBe(0);
    const levels = [5700, 6000, 6400, 6800, 7200, 7500].map((rpm) => shiftLightLevel(rpm, 8000).lit);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    expect(levels[0]).toBeGreaterThan(0);
    expect(levels[levels.length - 1]).toBeGreaterThan(levels[0]);
  });

  it('only lights every LED together with the shift cue (never all lit without "shift now")', () => {
    for (let rpm = 5600; rpm < 7600; rpm += 10) {
      const level = shiftLightLevel(rpm, 8000);
      expect(level.lit).toBeLessThan(SHIFT_LED_COUNT);
      expect(level.shiftNow).toBe(false);
    }
    expect(shiftLightLevel(7599, 8000).lit).toBe(SHIFT_LED_COUNT - 1);
  });

  it('lights every LED and asks to shift at 95% of the limit', () => {
    expect(shiftLightLevel(7599, 8000)).toMatchObject({ shiftNow: false });
    expect(shiftLightLevel(7600, 8000)).toEqual({ lit: SHIFT_LED_COUNT, shiftNow: true });
  });

  it('caps at all LEDs when rpm exceeds the limiter', () => {
    expect(shiftLightLevel(9000, 8000)).toEqual({ lit: SHIFT_LED_COUNT, shiftNow: true });
  });

  it('uses each car\'s own limit (same rpm, different cars)', () => {
    expect(shiftLightLevel(7600, 9000).shiftNow).toBe(false);
    expect(shiftLightLevel(7600, 7800).shiftNow).toBe(true);
  });

  it('never fires on invalid data', () => {
    for (const [rpm, max] of [[5000, 0], [5000, -1], [Number.NaN, 8000], [5000, Number.NaN], [-100, 8000]]) {
      expect(shiftLightLevel(rpm, max)).toEqual({ lit: 0, shiftNow: false });
    }
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ShiftLights from '@/components/forza/ShiftLights';
import { SHIFT_LED_COUNT } from '@/utils/forza';

const leds = () => screen.getAllByTestId('shift-led');
const lit = () => leds().filter((led) => led.getAttribute('data-lit') === 'true');

describe('ShiftLights', () => {
  it('renders a fixed row of LEDs, all off at low rpm', () => {
    render(<ShiftLights rpm={3000} maxRpm={8000} />);

    expect(leds()).toHaveLength(SHIFT_LED_COUNT);
    expect(lit()).toHaveLength(0);
    expect(screen.queryByText(/Troque de marcha/i)).not.toBeInTheDocument();
  });

  it('lights LEDs from the left as rpm approaches the limiter', () => {
    render(<ShiftLights rpm={6800} maxRpm={8000} />);

    const on = lit();
    expect(on.length).toBeGreaterThan(0);
    expect(on.length).toBeLessThan(SHIFT_LED_COUNT);
    const indexes = leds().map((led, i) => (led.getAttribute('data-lit') === 'true' ? i : -1)).filter((i) => i >= 0);
    expect(indexes).toEqual(Array.from({ length: on.length }, (_, i) => i));
  });

  it('colors the LEDs green, then red, then blue (F1 style)', () => {
    render(<ShiftLights rpm={7700} maxRpm={8000} />);

    const colors = leds().map((led) => led.getAttribute('data-color'));
    const third = SHIFT_LED_COUNT / 3;
    expect(colors).toEqual([
      ...Array(third).fill('green'),
      ...Array(third).fill('red'),
      ...Array(third).fill('blue'),
    ]);
  });

  it('shows a textual "shift now" cue (not color only) with every LED lit at the limit', () => {
    render(<ShiftLights rpm={7700} maxRpm={8000} />);

    expect(lit()).toHaveLength(SHIFT_LED_COUNT);
    expect(screen.getByText(/Troque de marcha/i)).toBeInTheDocument();
    expect(leds().every((led) => led.getAttribute('data-flashing') === 'true')).toBe(true);
  });

  it('does not flash before the shift point', () => {
    render(<ShiftLights rpm={7000} maxRpm={8000} />);

    expect(leds().every((led) => led.getAttribute('data-flashing') === 'false')).toBe(true);
  });

  it('exposes the state to assistive tech with a label', () => {
    render(<ShiftLights rpm={4000} maxRpm={8000} />);

    expect(screen.getByRole('img', { name: /Rotação em 50% do limite do motor/i })).toBeInTheDocument();
  });

  it('is safe with an unknown limit', () => {
    render(<ShiftLights rpm={4000} maxRpm={0} />);

    expect(lit()).toHaveLength(0);
    expect(screen.queryByText(/Troque de marcha/i)).not.toBeInTheDocument();
  });
});

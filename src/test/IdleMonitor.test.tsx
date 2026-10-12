import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IdleMonitor } from '@/components/IdleMonitor';
import { reportSessionActivity } from '@/utils/sessionActivity';

const { logout } = vi.hoisted(() => ({ logout: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, logout }), default: () => ({ isAuthenticated: true, logout }) }));

const MIN = 60_000;

const mount = () =>
  render(
    <MemoryRouter>
      <IdleMonitor />
    </MemoryRouter>,
  );

describe('IdleMonitor · logout por inatividade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('sem nenhuma atividade, desloga aos 15 minutos', () => {
    mount();

    act(() => vi.advanceTimersByTime(15 * MIN - 1));
    expect(logout).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(2));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('teclado/mouse adiam o logout', () => {
    mount();

    act(() => vi.advanceTimersByTime(14 * MIN));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });
    act(() => vi.advanceTimersByTime(14 * MIN));

    expect(logout).not.toHaveBeenCalled();
  });

  it('atividade reportada pela tela (ex.: telemetria ao vivo chegando) também adia o logout', () => {
    mount();

    act(() => vi.advanceTimersByTime(14 * MIN));
    act(() => reportSessionActivity());
    act(() => vi.advanceTimersByTime(14 * MIN));

    expect(logout).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(2 * MIN));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});

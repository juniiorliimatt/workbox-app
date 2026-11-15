import { act, render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IdleMonitor } from '@/components/IdleMonitor';
import { reportSessionActivity } from '@/utils/sessionActivity';

const { logout, auth, useAuthMock } = vi.hoisted(() => {
  const logoutFn = vi.fn().mockResolvedValue(undefined);
  // `unstableLogout`: imita o AuthProvider real, que entrega uma função `logout` nova a cada render do contexto.
  const state = { unstableLogout: false };
  const hook = () => ({
    isAuthenticated: true,
    logout: state.unstableLogout ? (...args: unknown[]) => logoutFn(...args) : logoutFn,
  });
  return { logout: logoutFn, auth: state, useAuthMock: hook };
});
vi.mock('@/hooks/useAuth', () => ({ useAuth: useAuthMock, default: useAuthMock }));

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
    auth.unstableLogout = false;
  });

  it('re-render do contexto de auth (ex.: renovação do token a cada 13 min) não adia o logout', () => {
    auth.unstableLogout = true;
    const view = mount();
    const rerender = () =>
      view.rerender(
        <MemoryRouter>
          <IdleMonitor />
        </MemoryRouter>,
      );

    act(() => vi.advanceTimersByTime(13 * MIN));
    act(() => rerender());
    act(() => vi.advanceTimersByTime(2 * MIN + 1));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('navegar entre telas conta como atividade', () => {
    let navigate: (to: string) => void = () => undefined;
    const Navigator = () => {
      navigate = useNavigate();
      return null;
    };
    render(
      <MemoryRouter initialEntries={['/moto']}>
        <IdleMonitor />
        <Navigator />
      </MemoryRouter>,
    );

    act(() => vi.advanceTimersByTime(14 * MIN));
    act(() => navigate('/financas'));
    act(() => vi.advanceTimersByTime(14 * MIN));
    expect(logout).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(MIN + 1));
    expect(logout).toHaveBeenCalledTimes(1);
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

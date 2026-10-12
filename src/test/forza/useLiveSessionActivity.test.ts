import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useLiveSessionActivity } from '@/hooks/useLiveSessionActivity';
import { SESSION_ACTIVITY_EVENT } from '@/utils/sessionActivity';
import { LiveStatus } from '@/hooks/useLiveSnapshot';

const SECOND = 1000;

describe('useLiveSessionActivity · telemetria chegando conta como atividade da sessão', () => {
  const onActivity = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    onActivity.mockClear();
    window.addEventListener(SESSION_ACTIVITY_EVENT, onActivity);
  });
  afterEach(() => {
    window.removeEventListener(SESSION_ACTIVITY_EVENT, onActivity);
    vi.useRealTimers();
  });

  it('com dados chegando (ready): reporta já e a cada minuto', () => {
    renderHook(() => useLiveSessionActivity('ready'));
    expect(onActivity).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(60 * SECOND));
    act(() => vi.advanceTimersByTime(60 * SECOND));

    expect(onActivity).toHaveBeenCalledTimes(3);
  });

  it.each<LiveStatus>(['loading', 'waiting', 'error'])('sem dados novos (%s): não reporta nada (o jogo parado não segura a sessão)', (status) => {
    renderHook(() => useLiveSessionActivity(status));

    act(() => vi.advanceTimersByTime(5 * 60 * SECOND));

    expect(onActivity).not.toHaveBeenCalled();
  });

  it('para de reportar quando os dados deixam de chegar', () => {
    const { rerender } = renderHook(({ status }) => useLiveSessionActivity(status), { initialProps: { status: 'ready' as LiveStatus } });
    expect(onActivity).toHaveBeenCalledTimes(1);

    rerender({ status: 'waiting' });
    act(() => vi.advanceTimersByTime(5 * 60 * SECOND));

    expect(onActivity).toHaveBeenCalledTimes(1);
  });

  it('para ao desmontar a tela', () => {
    const { unmount } = renderHook(() => useLiveSessionActivity('ready'));
    unmount();

    act(() => vi.advanceTimersByTime(5 * 60 * SECOND));

    expect(onActivity).toHaveBeenCalledTimes(1);
  });
});

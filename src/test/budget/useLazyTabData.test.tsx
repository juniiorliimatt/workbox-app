import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLazyTabData } from '@/hooks/useLazyTabData';

type Props = { active: boolean; keyValue: string };

const setup = (loader: (signal: AbortSignal) => Promise<string>, onError?: () => void, initial: Props = { active: false, keyValue: 'a' }) =>
  renderHook(({ active, keyValue }: Props) => useLazyTabData(active, keyValue, loader, onError), { initialProps: initial });

describe('useLazyTabData', () => {
  it('does not call the loader while the tab is inactive', () => {
    const loader = vi.fn().mockResolvedValue('x');

    const { result } = setup(loader);

    expect(loader).not.toHaveBeenCalled();
    expect(result.current).toEqual({ data: null, loading: false, error: false });
  });

  it('loads when the tab becomes active, exposing loading then the data', async () => {
    const loader = vi.fn().mockResolvedValue('dados');
    const { result, rerender } = setup(loader);

    rerender({ active: true, keyValue: 'a' });
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.data).toBe('dados'));
    expect(result.current.loading).toBe(false);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('keeps the loaded data when the tab is left and re-entered with the same key (no refetch)', async () => {
    const loader = vi.fn().mockResolvedValue('dados');
    const { result, rerender } = setup(loader, undefined, { active: true, keyValue: 'a' });
    await waitFor(() => expect(result.current.data).toBe('dados'));

    rerender({ active: false, keyValue: 'a' });
    rerender({ active: true, keyValue: 'a' });

    expect(result.current.data).toBe('dados');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('reloads immediately when the key changes while the tab is active', async () => {
    const loader = vi.fn().mockImplementation(() => Promise.resolve(`v${loader.mock.calls.length}`));
    const { result, rerender } = setup(loader, undefined, { active: true, keyValue: 'a' });
    await waitFor(() => expect(result.current.data).toBe('v1'));

    rerender({ active: true, keyValue: 'b' });

    await waitFor(() => expect(result.current.data).toBe('v2'));
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('marks a hidden tab stale when the key changes and reloads only when it is shown again', async () => {
    const loader = vi.fn().mockImplementation(() => Promise.resolve(`v${loader.mock.calls.length}`));
    const { result, rerender } = setup(loader, undefined, { active: true, keyValue: 'a' });
    await waitFor(() => expect(result.current.data).toBe('v1'));

    rerender({ active: false, keyValue: 'b' });
    expect(loader).toHaveBeenCalledTimes(1);

    rerender({ active: true, keyValue: 'b' });
    await waitFor(() => expect(result.current.data).toBe('v2'));
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('aborts the in-flight request when the key changes and when unmounted', async () => {
    const signals: AbortSignal[] = [];
    const loader = vi.fn().mockImplementation((signal: AbortSignal) => {
      signals.push(signal);
      return new Promise(() => undefined);
    });
    const { rerender, unmount } = setup(loader, undefined, { active: true, keyValue: 'a' });

    rerender({ active: true, keyValue: 'b' });
    expect(signals[0].aborted).toBe(true);

    unmount();
    expect(signals[1].aborted).toBe(true);
  });

  it('ignores the result of a superseded request', async () => {
    let resolveFirst: (v: string) => void = () => undefined;
    const loader = vi.fn()
      .mockImplementationOnce(() => new Promise<string>((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce('segundo');
    const { result, rerender } = setup(loader, undefined, { active: true, keyValue: 'a' });

    rerender({ active: true, keyValue: 'b' });
    await waitFor(() => expect(result.current.data).toBe('segundo'));
    await act(async () => resolveFirst('primeiro'));

    expect(result.current.data).toBe('segundo');
  });

  it('reports a failure through onError, stays retryable and shows no data', async () => {
    const onError = vi.fn();
    const loader = vi.fn().mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce('ok');
    const { result, rerender } = setup(loader, onError, { active: true, keyValue: 'a' });

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBeNull();

    rerender({ active: false, keyValue: 'a' });
    rerender({ active: true, keyValue: 'a' });

    await waitFor(() => expect(result.current.data).toBe('ok'));
    expect(result.current.error).toBe(false);
  });

  it('does not treat a cancelled request as an error', async () => {
    const onError = vi.fn();
    const loader = vi.fn().mockRejectedValue(Object.assign(new Error('canceled'), { code: 'ERR_CANCELED', __CANCEL__: true }));

    const { result } = setup(loader, onError, { active: true, keyValue: 'a' });
    await act(async () => undefined);

    expect(onError).not.toHaveBeenCalled();
    expect(result.current.error).toBe(false);
  });
});

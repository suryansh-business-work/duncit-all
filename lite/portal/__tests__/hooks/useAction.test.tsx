import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, screen } from '@testing-library/react';
import { NotifyHost } from '@duncit/dialogs';
import { useAction } from '../../hooks/useAction';

const wrapper = ({ children }: { children: ReactNode }) => (
  <>
    {children}
    <NotifyHost />
  </>
);

describe('useAction', () => {
  it('runs the work, says it worked, reloads and resolves true', async () => {
    const onDone = vi.fn();
    const work = vi.fn(() => Promise.resolve({ ok: true }));
    const { result } = renderHook(() => useAction(onDone), { wrapper });

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current(work, 'Bengaluru saved');
    });

    expect(outcome).toBe(true);
    expect(work).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('notify-success')).toHaveTextContent('Bengaluru saved');
  });

  it("shows the API's own message, skips the reload and resolves false when the work fails", async () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useAction(onDone), { wrapper });

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current(() => Promise.reject(Object.assign(new Error('wrapped'), { errors: [{ message: 'That slug is taken' }] })), 'Saved');
    });

    expect(outcome).toBe(false);
    expect(onDone).not.toHaveBeenCalled();
    expect(await screen.findByTestId('notify-error')).toHaveTextContent('That slug is taken');
    expect(screen.queryByTestId('notify-success')).not.toBeInTheDocument();
  });

  it('works without a reload callback', async () => {
    const { result } = renderHook(() => useAction(), { wrapper });
    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current(() => Promise.resolve(), 'Deleted');
    });
    expect(outcome).toBe(true);
    expect(await screen.findByTestId('notify-success')).toHaveTextContent('Deleted');
  });

  it('keeps one callback identity while the reload callback is the same', () => {
    const onDone = vi.fn();
    const { result, rerender } = renderHook(() => useAction(onDone), { wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

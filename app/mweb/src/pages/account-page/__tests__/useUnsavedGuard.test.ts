import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useUnsavedGuard } from '../useUnsavedGuard';

describe('useUnsavedGuard', () => {
  it('closes immediately when the form is not dirty', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useUnsavedGuard(onClose));

    act(() => result.current.requestClose());

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.confirmOpen).toBe(false);
  });

  it('opens the confirm instead of closing when dirty', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useUnsavedGuard(onClose));

    act(() => result.current.setDirty(true));
    act(() => result.current.requestClose());

    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.confirmOpen).toBe(true);
  });

  it('confirming the discard resets the form and closes', () => {
    const onClose = vi.fn();
    const reset = vi.fn();
    const { result } = renderHook(() => useUnsavedGuard(onClose));

    act(() => result.current.registerReset(reset));
    act(() => result.current.setDirty(true));
    act(() => result.current.requestClose());
    act(() => result.current.confirmDiscard());

    expect(reset).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.confirmOpen).toBe(false);
  });

  it('cancelling the discard keeps the dialog open and does not close', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useUnsavedGuard(onClose));

    act(() => result.current.setDirty(true));
    act(() => result.current.requestClose());
    act(() => result.current.cancelDiscard());

    expect(result.current.confirmOpen).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });
});

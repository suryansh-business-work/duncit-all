import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnsavedWarning } from '../../src/pages/inventory-page/inventory-product-page/useUnsavedWarning';

afterEach(() => vi.restoreAllMocks());

describe('useUnsavedWarning', () => {
  it('registers a beforeunload handler while active and removes it on cleanup', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useUnsavedWarning(true));
    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    const handler = add.mock.calls.find((c) => c[0] === 'beforeunload')?.[1] as EventListener;
    // The handler calls preventDefault to trigger the browser's leave prompt.
    const event = new Event('beforeunload');
    const prevent = vi.spyOn(event, 'preventDefault');
    handler(event);
    expect(prevent).toHaveBeenCalled();
    unmount();
    expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('does nothing when inactive', () => {
    const add = vi.spyOn(window, 'addEventListener');
    renderHook(() => useUnsavedWarning(false));
    expect(add).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, fireEvent } from '@testing-library/react';
import { notify, notifyError, notifySuccess, NotifyHost, NotifyProvider, useNotify } from '../../src/notify';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('notify dispatchers', () => {
  it('dispatches a custom event with the given severity', () => {
    const spy = vi.spyOn(window, 'dispatchEvent');
    notify('hello', 'warning', 1000);
    notifyError('bad');
    notifySuccess('good');
    expect(spy).toHaveBeenCalledTimes(3);
    const detail = (spy.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toMatchObject({ message: 'hello', severity: 'warning', duration: 1000 });
  });
});

describe('NotifyHost', () => {
  it('renders a dispatched message and ignores empty payloads', () => {
    render(<NotifyHost />);
    act(() => {
      window.dispatchEvent(new CustomEvent('duncit:notify', { detail: { message: '', severity: 'info' } }));
    });
    expect(screen.queryByText('shown')).toBeNull();
    act(() => notifySuccess('shown'));
    expect(screen.getByText('shown')).toBeInTheDocument();
  });

  it('keeps the message on clickaway but closes via the Alert button', () => {
    render(<NotifyHost />);
    act(() => notify('sticky'));
    fireEvent.click(document.body); // clickaway → ignored
    expect(screen.getByText('sticky')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByText('sticky')).toBeNull();
  });

  it('auto-hides after the duration elapses', () => {
    vi.useFakeTimers();
    render(<NotifyHost />);
    act(() => notify('temp', 'info', 50));
    expect(screen.getByText('temp')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByText('temp')).toBeNull();
  });
});

describe('NotifyProvider', () => {
  it('renders children and hosts dispatched notifications', () => {
    render(
      <NotifyProvider>
        <div data-testid="child">hi</div>
      </NotifyProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    act(() => notifySuccess('provider-msg'));
    expect(screen.getByText('provider-msg')).toBeInTheDocument();
  });
});

describe('useNotify', () => {
  it('returns a stable imperative API that dispatches events', () => {
    const spy = vi.spyOn(window, 'dispatchEvent');
    const { result, rerender } = renderHook(() => useNotify());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    result.current.notifySuccess('via-hook');
    expect(spy).toHaveBeenCalledTimes(1);
    const detail = (spy.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toMatchObject({ message: 'via-hook', severity: 'success' });
  });
});

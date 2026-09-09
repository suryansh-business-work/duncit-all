import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { TopProgressBar } from '../src/loader';

describe('TopProgressBar', () => {
  beforeEach(() => {
    // The bar's own timers AND the clock it measures its linger with — a real
    // Date.now() on a slow runner shortens the linger under the 150ms advanced
    // below. Nothing else in the worker sees a fake clock.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows nothing at rest', () => {
    render(<TopProgressBar busy={false} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('waits out the appear delay, so a cached answer never flashes a bar', () => {
    const { rerender } = render(<TopProgressBar busy />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    // Done before the delay elapsed: the pending appear is cancelled outright.
    rerender(<TopProgressBar busy={false} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('appears after the delay and lingers for the minimum visible time once busy ends', () => {
    const { rerender } = render(<TopProgressBar busy label="Saving the pod" />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('progressbar', { name: 'Saving the pod' })).toBeInTheDocument();

    rerender(<TopProgressBar busy={false} label="Saving the pod" />);
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('names itself with the shared label when none is given', () => {
    render(<TopProgressBar busy />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('progressbar', { name: 'Loading…' })).toBeInTheDocument();
  });
});

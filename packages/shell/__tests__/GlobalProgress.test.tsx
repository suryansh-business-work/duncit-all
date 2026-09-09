import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { GlobalProgress } from '../src/chrome/GlobalProgress';

/** A fetch that never answers until the test says so. */
function holdFetch() {
  let release!: () => void;
  const gate = new Promise<Response>((resolve) => {
    release = () => resolve({ ok: true } as Response);
  });
  vi.stubGlobal('fetch', vi.fn(() => gate));
  return release;
}

describe('GlobalProgress', () => {
  beforeEach(() => {
    // The bar's own timers and the clock its linger is measured with; faking
    // requestAnimationFrame as well would reach into suites sharing this worker.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('draws the bar while the transport has a request out, and drops it once it lands', async () => {
    const release = holdFetch();
    const { trackingFetch } = await import('../src/lib/request-progress');
    render(<GlobalProgress />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    let call!: Promise<Response>;
    // Two acts on purpose: the store update has to re-render (arming the bar's
    // appear timer) before the clock is moved past that delay.
    act(() => {
      call = trackingFetch('https://server.duncit.com/graphql');
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    await act(async () => {
      release();
      await call;
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});

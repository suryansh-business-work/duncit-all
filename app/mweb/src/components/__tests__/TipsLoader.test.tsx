import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOADING_TIP_INTERVAL_MS } from '@duncit/utils';
import TipsLoader from '../TipsLoader';

const TIPS = [
  'Tap any pod you joined to see its refund status and full timeline.',
  'Follow a club to catch its new pods and stories first.',
  'Search lets you discover experiences by interest.',
  'Rating a pod after it ends helps hosts make the next one even better.',
  'Share a pod with friends so you can join it together.',
  'Tap the location in the header to explore pods in another area.',
];

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const tip = () => screen.getByTestId('loader-tip');
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('TipsLoader', () => {
  it('shows a spinner, "Did you know?" and the first tip', () => {
    render(<TipsLoader testId="loader" />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.getByText('Did you know?')).toBeInTheDocument();
    expect(tip()).toHaveTextContent(TIPS[0]);
  });

  it('only the spinner speaks to a screen reader — the tip is not a live region', () => {
    render(<TipsLoader testId="loader" />);
    const spinners = screen.getAllByRole('progressbar');
    expect(spinners).toHaveLength(1);
    expect(spinners[0]).toHaveAccessibleName('Loading…');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(tip()).not.toHaveAttribute('aria-live');
  });

  it('holds a tip for the whole interval, then moves to the next', () => {
    render(<TipsLoader testId="loader" />);
    advance(LOADING_TIP_INTERVAL_MS - 1);
    expect(tip()).toHaveTextContent(TIPS[0]);
    advance(1);
    expect(tip()).toHaveTextContent(TIPS[1]);
    advance(LOADING_TIP_INTERVAL_MS);
    expect(tip()).toHaveTextContent(TIPS[2]);
  });

  it('wraps back to the first tip after the last', () => {
    render(<TipsLoader testId="loader" />);
    advance(LOADING_TIP_INTERVAL_MS * (TIPS.length - 1));
    expect(tip()).toHaveTextContent(TIPS[TIPS.length - 1]);
    advance(LOADING_TIP_INTERVAL_MS);
    expect(tip()).toHaveTextContent(TIPS[0]);
  });

  it('stops its timer when it unmounts', () => {
    const clear = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = render(<TipsLoader testId="loader" />);
    unmount();
    expect(clear).toHaveBeenCalledTimes(1);
    clear.mockRestore();
  });
});

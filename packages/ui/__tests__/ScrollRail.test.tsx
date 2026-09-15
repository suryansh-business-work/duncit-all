import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ScrollRail } from '../src/ScrollRail';

/**
 * jsdom lays nothing out: every element is 0px wide and has no scrollBy or
 * ResizeObserver. The rail only reads three numbers off its scroller, so those
 * are served from one mutable object the tests set before they act.
 */
const metrics = { scrollWidth: 0, clientWidth: 0, scrollLeft: 0 };
const scrollBy = vi.fn();
const disconnectSpy = vi.fn();
let resize: (() => void) | undefined;

class FakeResizeObserver {
  constructor(callback: () => void) {
    resize = callback;
  }
  observe = vi.fn();
  disconnect = disconnectSpy;
}

const PATCHED = ['scrollWidth', 'clientWidth', 'scrollLeft', 'scrollBy'] as const;

beforeAll(() => {
  const proto = HTMLElement.prototype;
  Object.defineProperty(proto, 'scrollWidth', { configurable: true, get: () => metrics.scrollWidth });
  Object.defineProperty(proto, 'clientWidth', { configurable: true, get: () => metrics.clientWidth });
  Object.defineProperty(proto, 'scrollLeft', {
    configurable: true,
    get: () => metrics.scrollLeft,
    set: (value: number) => {
      metrics.scrollLeft = value;
    },
  });
  Object.defineProperty(proto, 'scrollBy', { configurable: true, writable: true, value: scrollBy });
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
});

afterAll(() => {
  // Deleting the own properties hands the prototype chain back to jsdom's.
  for (const key of PATCHED) Reflect.deleteProperty(HTMLElement.prototype, key);
  vi.unstubAllGlobals();
});

beforeEach(() => {
  Object.assign(metrics, { scrollWidth: 0, clientWidth: 0, scrollLeft: 0 });
  scrollBy.mockClear();
  disconnectSpy.mockClear();
  resize = undefined;
});

const cards = ['DUN-POD-4821', 'DUN-POD-4822', 'DUN-POD-4823'].map((id) => (
  <div key={id}>{id}</div>
));

describe('ScrollRail', () => {
  it('renders the row with no arrows when it fits its container', () => {
    Object.assign(metrics, { scrollWidth: 400, clientWidth: 400 });
    render(<ScrollRail testId="club-pods-rail">{cards}</ScrollRail>);

    expect(screen.getByTestId('club-pods-rail')).toHaveTextContent('DUN-POD-4822');
    expect(screen.queryByRole('button', { name: 'Scroll left' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scroll right' })).not.toBeInTheDocument();
  });

  it('shows both arrows on overflow, the exhausted left one disabled, and pages right by 85%', async () => {
    Object.assign(metrics, { scrollWidth: 1000, clientWidth: 400, scrollLeft: 0 });
    render(
      <ScrollRail
        testId="club-pods-rail"
        bleed
        gap={1}
        alignItems="center"
        sx={{ minHeight: 120 }}
        contentSx={{ px: 2 }}
      >
        {cards}
      </ScrollRail>
    );

    const prev = screen.getByTestId('club-pods-rail-scroll-prev');
    const next = screen.getByTestId('club-pods-rail-scroll-next');
    expect(prev).toHaveAccessibleName('Scroll left');
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(next);
    await waitFor(() => expect(scrollBy).toHaveBeenCalledWith({ left: 340, behavior: 'smooth' }));
  });

  it('re-measures on scroll: at the far end the left arrow wakes and the right one fades', async () => {
    Object.assign(metrics, { scrollWidth: 1000, clientWidth: 400, scrollLeft: 0 });
    const { container } = render(<ScrollRail>{cards}</ScrollRail>);

    const prev = screen.getByRole('button', { name: 'Scroll left' });
    const next = screen.getByRole('button', { name: 'Scroll right' });
    // No testId: the arrows carry none either.
    expect(prev).not.toHaveAttribute('data-testid');

    metrics.scrollLeft = 600;
    // The rail is [prev arrow, scroller, next arrow].
    fireEvent.scroll((container.firstChild as HTMLElement).children[1]);
    expect(prev).toBeEnabled();
    expect(next).toBeDisabled();

    fireEvent.click(prev);
    await waitFor(() => expect(scrollBy).toHaveBeenCalledWith({ left: -340, behavior: 'smooth' }));
  });

  it('drops the arrows when a resize makes the row fit, and stops observing on unmount', () => {
    Object.assign(metrics, { scrollWidth: 1000, clientWidth: 400 });
    const { unmount } = render(<ScrollRail testId="home-rail">{cards}</ScrollRail>);
    expect(screen.getByTestId('home-rail-scroll-next')).toBeInTheDocument();

    metrics.clientWidth = 1000;
    act(() => resize?.());
    expect(screen.queryByTestId('home-rail-scroll-next')).not.toBeInTheDocument();

    unmount();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});

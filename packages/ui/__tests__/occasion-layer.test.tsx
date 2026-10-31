import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { OccasionDesign } from '@duncit/utils';

import { OccasionBoundary } from '../src/occasion/OccasionBoundary';
import { OccasionEffects } from '../src/occasion/OccasionEffects';
import { OccasionGreeting } from '../src/occasion/OccasionGreeting';
import { OccasionLayer } from '../src/occasion/OccasionLayer';

// The canvas loop has its own suite (occasion-canvas.test.ts); here only what the components ask of it matters.
const { runOccasionCanvas, stopCanvas } = vi.hoisted(() => {
  const stop = vi.fn();
  return { stopCanvas: stop, runOccasionCanvas: vi.fn((..._args: unknown[]): (() => void) => stop) };
});
vi.mock('../src/occasion/runOccasionCanvas', () => ({ runOccasionCanvas }));

const QUIET: OccasionDesign = {
  key: 'quiet',
  name: 'Quiet',
  color_mode: 'AUTO',
  palette_light: {},
  palette_dark: {},
  particles: [],
  flyers: [],
  fireworks: { enabled: false, colors: [], bursts_per_minute: 0, sparks: 0, radius: 0 },
  overlays: [],
  garland: { style: 'NONE', colors: [] },
  greeting: '',
};

const CHRISTMAS: OccasionDesign = {
  ...QUIET,
  key: 'christmas',
  name: 'Christmas',
  greeting: '  Merry Christmas from Duncit!  ',
  particles: [{ shapes: ['SNOWFLAKE'], custom_paths: [], colors: ['#FFFFFF'], motion: 'FALL', count: 40, size_min: 4, size_max: 12, speed: 40, opacity: 1 }],
};

/** Still, with an overlay: decoration to draw, nothing that moves. */
const STILL: OccasionDesign = { ...QUIET, key: 'still', overlays: [{ style: 'VIGNETTE', color: '#000000', opacity: 0.4 }] };

let reduced: { matches: boolean; listeners: Set<() => void> };

beforeEach(() => {
  runOccasionCanvas.mockClear();
  stopCanvas.mockClear();
  localStorage.clear();
  sessionStorage.clear();
  reduced = { matches: false, listeners: new Set() };
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return reduced.matches;
    },
    addEventListener: (_: string, fn: () => void) => reduced.listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => reduced.listeners.delete(fn),
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const lastCanvasOptions = () => runOccasionCanvas.mock.calls.at(-1)?.[2];

describe('OccasionEffects', () => {
  it('paints over the viewport, hidden from assistive technology, and stops its loop when it unmounts', () => {
    const { unmount } = render(<OccasionEffects decoration={CHRISTMAS} />);
    const canvas = screen.getByTestId('occasion-effects');
    const frame = screen.getByTestId('occasion-effects-frame');

    expect(canvas.tagName).toBe('CANVAS');
    expect(frame).toContainElement(canvas);
    expect(frame).toHaveAttribute('aria-hidden', 'true');
    expect(frame).toHaveStyle({ position: 'fixed', pointerEvents: 'none' });
    expect(runOccasionCanvas).toHaveBeenCalledWith(canvas, CHRISTMAS, { contained: false, still: false, stillAt: undefined });

    unmount();
    expect(stopCanvas).toHaveBeenCalled();
  });

  it('fills its parent box for a preview and can show one still instant', () => {
    render(<OccasionEffects decoration={CHRISTMAS} contained still stillAt={4} />);

    expect(screen.getByTestId('occasion-effects-frame')).toHaveStyle({ position: 'absolute' });
    expect(lastCanvasOptions()).toEqual({ contained: true, still: true, stillAt: 4 });
  });
});

describe('OccasionGreeting', () => {
  it('announces the line politely and goes by itself after a few seconds', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<OccasionGreeting text="Happy Diwali!" onClose={onClose} />);

    expect(screen.getByRole('status')).toHaveTextContent('Happy Diwali!');
    // Two steps: the close only commits when the first act ends, and only then
    // does the exit transition start its own timer.
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes straight away from its button, without animating when asked not to', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<OccasionGreeting text="Eid Mubarak!" instant onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss greeting' }));
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('OccasionBoundary', () => {
  it('logs a crash in the decoration and renders nothing in its place', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onError = vi.fn();
    const Boom = () => {
      throw new Error('canvas exploded');
    };
    const { container } = render(
      <OccasionBoundary onError={onError}>
        <Boom />
      </OccasionBoundary>,
    );

    expect(container).toBeEmptyDOMElement();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'canvas exploded' }), expect.anything());
  });
});

describe('OccasionLayer', () => {
  it('draws nothing for a look with no decoration and no greeting', () => {
    const { container } = render(<OccasionLayer design={QUIET} onError={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
    expect(runOccasionCanvas).not.toHaveBeenCalled();
  });

  it('owes a pause control while something moves, and remembers the choice for that look', () => {
    render(<OccasionLayer design={CHRISTMAS} onError={vi.fn()} />);
    const pause = screen.getByRole('button', { name: 'Pause the celebration' });

    expect(pause).toHaveAttribute('aria-pressed', 'false');
    expect(lastCanvasOptions()).toMatchObject({ still: false });

    fireEvent.click(pause);
    expect(screen.getByRole('button', { name: 'Play the celebration' })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('duncit_occasion_paused:christmas')).toBe('1');
    expect(lastCanvasOptions()).toMatchObject({ still: true });

    fireEvent.click(screen.getByRole('button', { name: 'Play the celebration' }));
    expect(localStorage.getItem('duncit_occasion_paused:christmas')).toBeNull();
  });

  it('starts paused when the viewer paused this look before', () => {
    localStorage.setItem('duncit_occasion_paused:christmas', '1');
    render(<OccasionLayer design={CHRISTMAS} onError={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Play the celebration' })).toBeInTheDocument();
    expect(lastCanvasOptions()).toMatchObject({ still: true });
  });

  it('shows the decoration still with nothing to pause under reduced motion, and follows the setting live', () => {
    reduced.matches = true;
    render(<OccasionLayer design={CHRISTMAS} onError={vi.fn()} />);

    expect(screen.queryByTestId('occasion-pause')).not.toBeInTheDocument();
    expect(lastCanvasOptions()).toMatchObject({ still: true });

    reduced.matches = false;
    act(() => reduced.listeners.forEach((fn) => fn()));
    expect(screen.getByTestId('occasion-pause')).toBeInTheDocument();
  });

  it('draws still decoration without a pause control when nothing in the look moves', () => {
    render(<OccasionLayer design={STILL} onError={vi.fn()} />);

    expect(screen.getByTestId('occasion-effects')).toBeInTheDocument();
    expect(screen.queryByTestId('occasion-pause')).not.toBeInTheDocument();
  });

  it('greets once a session: a closed greeting stays closed', () => {
    vi.useFakeTimers();
    const { unmount } = render(<OccasionLayer design={CHRISTMAS} onError={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('Merry Christmas from Duncit!');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss greeting' }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(sessionStorage.getItem('duncit_occasion_greeted:christmas')).toBe('1');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    unmount();
    render(<OccasionLayer design={CHRISTMAS} onError={vi.fn()} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('logs storage the browser refuses and still honours the choice for this visit', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const onError = vi.fn();
    render(<OccasionLayer design={CHRISTMAS} onError={onError} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pause the celebration' }));

    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'storage');
    expect(screen.getByRole('button', { name: 'Play the celebration' })).toBeInTheDocument();
  });

  it('logs a crash in its decoration as a render failure and lets the page carry on', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    runOccasionCanvas.mockImplementationOnce(() => {
      throw new Error('no 2d context');
    });
    const onError = vi.fn();
    render(<OccasionLayer design={CHRISTMAS} onError={onError} />);

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'no 2d context' }), 'render');
    expect(screen.queryByTestId('occasion-effects')).not.toBeInTheDocument();
  });

  it('starts a new look with its own pause and greeting state', () => {
    localStorage.setItem('duncit_occasion_paused:christmas', '1');
    const { rerender } = render(<OccasionLayer design={CHRISTMAS} onError={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Play the celebration' })).toBeInTheDocument();

    rerender(<OccasionLayer design={{ ...CHRISTMAS, key: 'new-year', greeting: 'Happy New Year!' }} onError={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Pause the celebration' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Happy New Year!');
  });

  it('works where the browser has no matchMedia at all', () => {
    vi.stubGlobal('matchMedia', undefined);
    render(<OccasionLayer design={CHRISTMAS} onError={vi.fn()} />);

    expect(screen.getByTestId('occasion-pause')).toBeInTheDocument();
  });
});

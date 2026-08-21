import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { playNotificationBeep } from '../src/notification-beep';

type FakeOscillator = {
  frequency: { value: number };
  type: string;
  connect: Mock;
  start: Mock;
  stop: Mock;
};

type FakeGain = {
  gain: { setValueAtTime: Mock; exponentialRampToValueAtTime: Mock };
  connect: Mock;
};

/**
 * A stand-in for the browser's `AudioContext` (jsdom ships none): records every
 * node it hands out so a test can read back the schedule the beep wrote.
 */
const fakeAudioContext = (opts: { currentTime?: number; close?: () => Promise<void> } = {}) => {
  const instances: FakeCtx[] = [];
  class FakeCtx {
    readonly currentTime = opts.currentTime ?? 0;
    readonly destination = { node: 'speakers' };
    readonly oscillators: FakeOscillator[] = [];
    readonly gains: FakeGain[] = [];
    readonly close = vi.fn(opts.close ?? (() => Promise.resolve()));
    constructor() {
      instances.push(this);
    }
    createOscillator(): FakeOscillator {
      const osc: FakeOscillator = {
        frequency: { value: 0 },
        type: '',
        // The real node returns its destination so `.connect(a).connect(b)` chains.
        connect: vi.fn((node: unknown) => node),
        start: vi.fn(),
        stop: vi.fn(),
      };
      this.oscillators.push(osc);
      return osc;
    }
    createGain(): FakeGain {
      const gain: FakeGain = {
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn((node: unknown) => node),
      };
      this.gains.push(gain);
      return gain;
    }
  }
  return { Ctx: FakeCtx, instances };
};

/**
 * Beep once against a context whose clock reads `currentTime` and hand back the
 * context, so a test can read the schedule the beep wrote. The clock is
 * deliberately non-zero in the timing tests: an offset scheduled "from zero"
 * instead of "from now" would land in the past and play immediately.
 */
const beepAt = (currentTime: number) => {
  const { Ctx, instances } = fakeAudioContext({ currentTime });
  vi.stubGlobal('AudioContext', Ctx);
  playNotificationBeep();
  return instances[0];
};

/** A scheduled time, compared to 6 places — `100 + 0.22 + 0.02` is not exactly 100.24. */
const near = (n: number) => expect.closeTo(n, 6);

beforeEach(() => {
  vi.useFakeTimers();
  // Neither flavour exists in jsdom; pin that so each test opts into exactly one.
  vi.stubGlobal('AudioContext', undefined);
  vi.stubGlobal('webkitAudioContext', undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('playNotificationBeep', () => {
  it('is a silent no-op in a runtime without Web Audio', () => {
    expect(() => playNotificationBeep()).not.toThrow();
    // No context means nothing to close later either.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('prefers the standard AudioContext when both flavours exist', () => {
    const standard = fakeAudioContext();
    const webkit = fakeAudioContext();
    vi.stubGlobal('AudioContext', standard.Ctx);
    vi.stubGlobal('webkitAudioContext', webkit.Ctx);
    playNotificationBeep();
    // Exactly one context per beep — contexts are the resource being rationed.
    expect(standard.instances).toHaveLength(1);
    expect(webkit.instances).toHaveLength(0);
  });

  it('falls back to the webkit-prefixed constructor on older Safari', () => {
    const webkit = fakeAudioContext();
    vi.stubGlobal('webkitAudioContext', webkit.Ctx);
    playNotificationBeep();
    expect(webkit.instances).toHaveLength(1);
  });

  // Starting an oscillator twice throws InvalidStateError in a real browser, so
  // each tone gets exactly one `start` — asserted as the full call list.
  it('plays a high 880 Hz sine followed by a lower 660 Hz sine 220 ms later', () => {
    const ctx = beepAt(100);
    expect(ctx.oscillators).toHaveLength(2);
    const [first, second] = ctx.oscillators;
    expect(first.frequency.value).toBe(880);
    expect(second.frequency.value).toBe(660);
    expect(first.type).toBe('sine');
    expect(second.type).toBe('sine');
    // Scheduled against the context clock, not from zero.
    expect(first.start.mock.calls).toEqual([[100]]);
    expect(second.start.mock.calls).toEqual([[near(100.22)]]);
  });

  it('stops each oscillator 20 ms after its tone has faded out', () => {
    const [first, second] = beepAt(100).oscillators;
    // 180 ms tone + 20 ms tail; 220 ms tone + 20 ms tail after a 220 ms offset.
    expect(first.stop.mock.calls).toEqual([[near(100.2)]]);
    expect(second.stop.mock.calls).toEqual([[near(100.46)]]);
  });

  // A square-edged gain change clicks, so each tone fades in over 20 ms and
  // fades back out by the end of its duration instead of switching on and off.
  // The floor is 0.0001, not 0: an exponential ramp from or to zero throws a
  // RangeError in a real browser, which the outer catch would turn into silence.
  it('ramps each tone in over 20 ms and back out by its end, never from or to zero', () => {
    const ctx = beepAt(100);
    expect(ctx.gains).toHaveLength(2);
    const [first, second] = ctx.gains;

    expect(first.gain.setValueAtTime.mock.calls).toEqual([[0.0001, 100]]);
    expect(first.gain.exponentialRampToValueAtTime.mock.calls).toEqual([
      [0.18, near(100.02)],
      [0.0001, near(100.18)],
    ]);

    expect(second.gain.setValueAtTime.mock.calls).toEqual([[0.0001, near(100.22)]]);
    expect(second.gain.exponentialRampToValueAtTime.mock.calls).toEqual([
      [0.18, near(100.24)],
      [0.0001, near(100.44)],
    ]);
  });

  it('routes each oscillator through its own gain node into the speakers', () => {
    const ctx = beepAt(0);
    expect(ctx.oscillators).toHaveLength(2);
    ctx.oscillators.forEach((osc, i) => {
      // One connection each: the oscillator into ITS gain, that gain into the output.
      expect(osc.connect.mock.calls).toEqual([[ctx.gains[i]]]);
      expect(ctx.gains[i].connect.mock.calls).toEqual([[ctx.destination]]);
    });
  });

  // Contexts are a limited resource: a chat page that beeps all day would hit
  // the browser's cap if each one were left open.
  it('closes the context 800 ms after the beep, not before', () => {
    const ctx = beepAt(0);
    vi.advanceTimersByTime(799);
    expect(ctx.close).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(ctx.close).toHaveBeenCalledTimes(1);
  });

  // The browser may have torn the context down before the timer fires (tab
  // backgrounded, page unloading). That rejection must be absorbed inside the
  // beep — an unhandled rejection on the page is exactly the noise a
  // best-effort sound must never make.
  it('absorbs a context that refuses to close instead of surfacing the rejection', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      const { Ctx, instances } = fakeAudioContext({
        close: () => Promise.reject(new Error('already closed')),
      });
      vi.stubGlobal('AudioContext', Ctx);
      playNotificationBeep();
      await vi.advanceTimersByTimeAsync(800);
      // Node reports an orphaned rejection only once the event loop turns, so
      // give it a real turn before asking whether anything surfaced.
      vi.useRealTimers();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(instances[0].close).toHaveBeenCalledTimes(1);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  // Browsers cap the number of live contexts and throw past it; a notification
  // nobody hears must never cost the notification itself.
  it('swallows a browser that refuses to construct a context', () => {
    class Refusing {
      constructor() {
        throw new Error('too many AudioContexts');
      }
    }
    vi.stubGlobal('AudioContext', Refusing);
    expect(() => playNotificationBeep()).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('swallows a failure part-way through scheduling without leaking a timer', () => {
    const { Ctx, instances } = fakeAudioContext();
    vi.stubGlobal('AudioContext', Ctx);
    vi.spyOn(Ctx.prototype, 'createGain').mockImplementation(() => {
      throw new Error('audio graph locked');
    });
    expect(() => playNotificationBeep()).not.toThrow();
    // The context was built but the close timer never got scheduled.
    expect(instances).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

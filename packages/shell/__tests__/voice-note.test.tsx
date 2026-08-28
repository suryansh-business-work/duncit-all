/**
 * Voice notes: recording one, and playing one back.
 *
 * The waveform is sampled AS IT RECORDS rather than decoded afterwards —
 * decoding an audio blob to draw it means holding the whole thing in memory
 * twice and a visible pause before the note can be sent. On the way back the
 * same bars are how you find the part you want without scrubbing blind through
 * somebody's silence.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';

import VoiceNotePlayer from '../src/staff-chat/voice/VoiceNotePlayer';
import VoiceRecorderBar from '../src/staff-chat/voice/VoiceRecorderBar';
import { condense, useVoiceNote } from '../src/staff-chat/voice/useVoiceNote';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

/** A MediaRecorder the test drives by hand. */
class FakeRecorder {
  static supported = ['audio/webm;codecs=opus'];
  static isTypeSupported = (type: string) => FakeRecorder.supported.includes(type);
  static last: FakeRecorder | null = null;

  mimeType = 'audio/webm;codecs=opus';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  stopped = false;

  constructor(
    readonly stream: { getTracks: () => { stop: () => void }[] },
    readonly options?: Record<string, unknown>,
  ) {
    FakeRecorder.last = this;
  }

  start() {
    this.ondataavailable?.({ data: new Blob(['aa']) });
    // A zero-length chunk is dropped rather than padding the note.
    this.ondataavailable?.({ data: new Blob([]) });
  }

  stop() {
    this.stopped = true;
    this.onstop?.();
  }
}

const track = { stop: vi.fn() };

const stubMedia = (over: { getUserMedia?: unknown; audioContext?: boolean } = {}) => {
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  vi.stubGlobal('navigator', {
    ...globalThis.navigator,
    mediaDevices: {
      getUserMedia:
        over.getUserMedia ?? vi.fn().mockResolvedValue({ getTracks: () => [track] }),
    },
  });
  if (over.audioContext !== false) {
    vi.stubGlobal(
      'AudioContext',
      class {
        createAnalyser() {
          return {
            fftSize: 0,
            frequencyBinCount: 4,
            getByteFrequencyData: (bins: Uint8Array) => bins.fill(128),
          };
        }
        createMediaStreamSource() {
          return { connect: vi.fn() };
        }
        close() {
          return Promise.resolve();
        }
      },
    );
  }
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  return frames;
};

beforeEach(() => {
  FakeRecorder.last = null;
  FakeRecorder.supported = ['audio/webm;codecs=opus'];
  track.stop.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('condense', () => {
  // A twenty-second note and a two-second one draw the same width.
  it('reduces however many samples were taken to a fixed number of bars', () => {
    expect(condense([0, 1, 0, 1, 0, 1, 0, 1], 4)).toEqual([0.5, 0.5, 0.5, 0.5]);
  });

  it('draws a flat line when nothing was sampled at all', () => {
    expect(condense([], 3)).toEqual([0, 0, 0]);
  });

  it('never leaves a bucket empty when there are fewer samples than bars', () => {
    const bars = condense([1, 0.5], 5);

    expect(bars).toHaveLength(5);
    expect(bars.every((value) => Number.isFinite(value))).toBe(true);
  });
});

describe('useVoiceNote', () => {
  it('says so rather than failing silently on a browser that cannot record', async () => {
    vi.stubGlobal('MediaRecorder', undefined);
    const { result } = renderHook(() => useVoiceNote());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.error).toBe('This browser cannot record audio.');
    expect(result.current.recording).toBe(false);
  });

  it('states the reason when the microphone was refused', async () => {
    stubMedia({ getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')) });
    const { result } = renderHook(() => useVoiceNote());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.error).toBe('Permission denied');
  });

  it('states its own reason when the refusal said nothing', async () => {
    stubMedia({ getUserMedia: vi.fn().mockRejectedValue('nope') });
    const { result } = renderHook(() => useVoiceNote());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.error).toBe('Could not open the microphone');
  });

  it('records at the best container the browser offers', async () => {
    stubMedia();
    const { result } = renderHook(() => useVoiceNote());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.recording).toBe(true);
    expect(FakeRecorder.last?.options).toMatchObject({
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 64_000,
    });
  });

  it('records without naming a container when the browser supports none of them', async () => {
    FakeRecorder.supported = [];
    stubMedia();
    const { result } = renderHook(() => useVoiceNote());

    await act(async () => {
      await result.current.start();
    });

    expect(FakeRecorder.last?.options).not.toHaveProperty('mimeType');
  });

  // Reading the analyser on the way past costs nothing and produces the same
  // picture as decoding the blob afterwards would.
  it('samples the loudness while it records', async () => {
    const frames = stubMedia();
    const { result } = renderHook(() => useVoiceNote());
    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      frames.shift()?.(0);
    });

    expect(result.current.level).toBeGreaterThan(0);
  });

  it('records without a waveform on a browser with no audio context at all', async () => {
    stubMedia({ audioContext: false });
    vi.stubGlobal('AudioContext', undefined);
    const { result } = renderHook(() => useVoiceNote());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.recording).toBe(true);
    expect(result.current.level).toBe(0);
  });

  it('hands back the note, its length and its shape', async () => {
    const frames = stubMedia();
    const { result } = renderHook(() => useVoiceNote());
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      frames.shift()?.(0);
    });

    let note: Awaited<ReturnType<typeof result.current.stop>> = null;
    await act(async () => {
      note = await result.current.stop(true);
    });

    expect(note?.blob.size).toBeGreaterThan(0);
    expect(note?.seconds).toBeGreaterThanOrEqual(1);
    expect(note?.peaks).toHaveLength(48);
    expect(track.stop).toHaveBeenCalled();
    expect(result.current.recording).toBe(false);
  });

  it('hands back nothing when the note was discarded', async () => {
    stubMedia();
    const { result } = renderHook(() => useVoiceNote());
    await act(async () => {
      await result.current.start();
    });

    let note: unknown = 'unset';
    await act(async () => {
      note = await result.current.stop(false);
    });

    expect(note).toBeNull();
  });

  it('hands back nothing when there was never anything recording', async () => {
    stubMedia();
    const { result } = renderHook(() => useVoiceNote());

    let note: unknown = 'unset';
    await act(async () => {
      note = await result.current.stop(true);
    });

    expect(note).toBeNull();
  });

  it('releases the microphone when the composer goes away mid-recording', async () => {
    stubMedia();
    const { result, unmount } = renderHook(() => useVoiceNote());
    await act(async () => {
      await result.current.start();
    });

    unmount();

    expect(track.stop).toHaveBeenCalled();
  });

  // The clock is what tells somebody how long they have talked.
  it('counts the seconds while it runs', async () => {
    vi.useFakeTimers();
    stubMedia();
    const { result } = renderHook(() => useVoiceNote());
    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });

    expect(result.current.seconds).toBeGreaterThan(0);
    vi.useRealTimers();
  });
});

describe('VoiceRecorderBar', () => {
  const bar = (over: Record<string, unknown> = {}) => {
    const props = { seconds: 5, level: 0.5, onCancel: vi.fn(), onSend: vi.fn(), ...over };
    const view = render(<VoiceRecorderBar {...(props as never)} />);
    return { props, ...view };
  };

  it('shows how long the note has run, as a clock', () => {
    bar({ seconds: 75 });

    expect(screen.getByText('1:15')).toBeInTheDocument();
  });

  it('pads the seconds so the clock never jumps width', () => {
    bar({ seconds: 5 });

    expect(screen.getByText('0:05')).toBeInTheDocument();
  });

  it('offers both ways out, and reports which was taken', () => {
    const { props } = bar();

    fireEvent.click(screen.getByRole('button', { name: 'Discard voice note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send voice note' }));

    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onSend).toHaveBeenCalledTimes(1);
  });

  // A decorative animation looks identical whether or not anything is being
  // picked up, which is exactly the question somebody recording wants answered.
  it('draws the bars from the live level rather than a timer', () => {
    const { container: quiet } = render(
      <VoiceRecorderBar seconds={1} level={0} onCancel={vi.fn()} onSend={vi.fn()} />
    );
    const quietMarkup = quiet.innerHTML;

    const { container: loud } = render(
      <VoiceRecorderBar seconds={1} level={1} onCancel={vi.fn()} onSend={vi.fn()} />
    );
    const loudMarkup = loud.innerHTML;

    expect(loudMarkup).not.toBe(quietMarkup);
  });
});

describe('VoiceNotePlayer', () => {
  const player = (over: Record<string, unknown> = {}) => {
    const props = {
      url: 'https://ik.imagekit.io/duncit/chat/note.webm',
      peaks: [0.2, 0.8, 0.4, 0.9],
      seconds: 12,
      ...over,
    };
    return render(<VoiceNotePlayer {...(props as never)} />);
  };

  const audioOf = (container: HTMLElement) => container.querySelector('audio') as HTMLAudioElement;

  it('offers play, and switches to pause once it is running', () => {
    const { container } = player();
    const audio = audioOf(container);
    Object.defineProperty(audio, 'paused', { configurable: true, value: true });
    audio.play = vi.fn().mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Play the voice note' }));
    expect(audio.play).toHaveBeenCalled();

    fireEvent.play(audio);
    expect(screen.getByRole('button', { name: 'Pause the voice note' })).toBeInTheDocument();
  });

  it('pauses a note that is already running', () => {
    const { container } = player();
    const audio = audioOf(container);
    Object.defineProperty(audio, 'paused', { configurable: true, value: false });
    audio.pause = vi.fn();

    fireEvent.click(screen.getByRole('button', { name: 'Play the voice note' }));

    expect(audio.pause).toHaveBeenCalled();
  });

  it('counts back down to zero, and starts over when the note ends', () => {
    const { container } = player();
    const audio = audioOf(container);
    expect(screen.getByText('0:12')).toBeInTheDocument();

    Object.defineProperty(audio, 'currentTime', { configurable: true, writable: true, value: 4 });
    fireEvent.timeUpdate(audio);
    expect(screen.getByText('0:08')).toBeInTheDocument();

    fireEvent.ended(audio);
    expect(screen.getByText('0:12')).toBeInTheDocument();
  });

  // The bars are how you find the part you want without scrubbing blind.
  it('seeks to the bar that was clicked', () => {
    const { container } = player();
    const audio = audioOf(container);
    Object.defineProperty(audio, 'currentTime', { configurable: true, writable: true, value: 0 });
    const strip = container.querySelectorAll('div')[1];
    strip.getBoundingClientRect = () => ({ left: 0, width: 100 }) as DOMRect;

    fireEvent.click(strip, { clientX: 50 });

    expect(audio.currentTime).toBeCloseTo(6);
  });

  it('seeks nowhere on a note with no known length', () => {
    const { container } = player({ seconds: 0 });
    const audio = audioOf(container);
    Object.defineProperty(audio, 'currentTime', { configurable: true, writable: true, value: 0 });
    const strip = container.querySelectorAll('div')[1];
    strip.getBoundingClientRect = () => ({ left: 0, width: 100 }) as DOMRect;

    fireEvent.click(strip, { clientX: 50 });

    expect(audio.currentTime).toBe(0);
  });

  it('draws a flat line for a note recorded before the waveform existed', () => {
    const { container } = player({ peaks: [] });

    // 24 flat bars rather than nothing at all.
    expect(container.querySelectorAll('[class*="MuiBox"]').length).toBeGreaterThan(20);
  });

  // 2× is where speech stops being words.
  it('cycles the speed through its three steps and back', () => {
    const { container } = player();
    const audio = audioOf(container);
    const speed = screen.getByRole('button', { name: /Playback speed/ });

    expect(audio.playbackRate).toBe(1);
    fireEvent.click(speed);
    expect(audio.playbackRate).toBe(1.5);
    fireEvent.click(screen.getByRole('button', { name: /Playback speed/ }));
    expect(audio.playbackRate).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: /Playback speed/ }));
    expect(audio.playbackRate).toBe(1);
  });
});

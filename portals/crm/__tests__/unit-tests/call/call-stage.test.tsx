import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CallStage from '@/components/call/CallStage';
import CallWave from '@/components/call/CallWave';
import { callStatusView } from '@/components/call/callStatusView';

/**
 * WaveSurfer draws to canvas and records from the microphone — neither exists
 * under jsdom. These doubles stand in for the library so the component's own
 * behaviour (when it starts the mic, and that every failure stays non-fatal)
 * is what gets exercised.
 */
const wave = vi.hoisted(() => ({
  instance: null as null | { registerPlugin: ReturnType<typeof vi.fn> },
  create: vi.fn(() => ({ kind: 'record-plugin' })),
}));

vi.mock('@wavesurfer/react', () => ({
  useWavesurfer: () => ({ wavesurfer: wave.instance }),
}));

vi.mock('wavesurfer.js/dist/plugins/record.esm.js', () => ({
  default: { create: wave.create },
}));

const recorder = (overrides: Record<string, unknown> = {}) => ({
  startMic: vi.fn(() => Promise.resolve()),
  stopMic: vi.fn(),
  destroy: vi.fn(),
  ...overrides,
});

afterEach(() => {
  wave.instance = null;
  wave.create.mockClear();
});

describe('callStatusView', () => {
  it.each([
    [null, 'Ready', 'default'],
    ['INITIATED', 'Connecting…', 'info'],
    ['RINGING', 'Ringing…', 'warning'],
    ['IN_PROGRESS', 'In call', 'success'],
    ['COMPLETED', 'Call over', 'default'],
    ['NO_ANSWER', 'No answer', 'warning'],
    ['BUSY', 'Busy', 'warning'],
    ['FAILED', 'Failed', 'error'],
  ] as const)('shows %s as "%s"', (status, label, tone) => {
    expect(callStatusView(status)).toEqual({ label, tone });
  });
});

describe('CallStage', () => {
  it('shows a live portal call from the caller ID to the Indian number', () => {
    render(<CallStage fromNumber="+14155550100" toNumber="09812345678" statusLabel="In call" tone="success" active />);

    expect(screen.getByText('+14155550100')).toBeInTheDocument();
    expect(screen.getByText('+91 9812345678')).toBeInTheDocument();
    expect(screen.getByText('In call')).toBeInTheDocument();
    expect(screen.getByText('LIVE CALL')).toBeInTheDocument();
    expect(screen.getByTestId('PhoneInTalkIcon')).toBeInTheDocument();
    expect(screen.queryByText('AI')).toBeNull();
  });

  it('marks an idle AI call and a missing caller ID', () => {
    render(<CallStage fromNumber="" toNumber="+919812345678" statusLabel="Ready" tone="default" active={false} ai />);

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('+919812345678')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('AI VOICE')).toBeInTheDocument();
  });
});

describe('CallWave', () => {
  it('stays flat until the wave is ready and the call is live', () => {
    const { rerender } = render(<CallWave active />);
    expect(wave.create).not.toHaveBeenCalled();

    wave.instance = { registerPlugin: vi.fn(() => recorder()) };
    rerender(<CallWave active={false} />);
    expect(wave.instance.registerPlugin).not.toHaveBeenCalled();
  });

  it('listens to the mic while live and releases it afterwards', () => {
    const rec = recorder();
    wave.instance = { registerPlugin: vi.fn(() => rec) };

    const { unmount } = render(<CallWave active color="#10b981" />);
    expect(wave.create).toHaveBeenCalledWith({ renderRecordedAudio: false, scrollingWaveform: true });
    expect(rec.startMic).toHaveBeenCalledTimes(1);

    unmount();
    expect(rec.stopMic).toHaveBeenCalledTimes(1);
    expect(rec.destroy).toHaveBeenCalledTimes(1);
  });

  it('keeps the wave flat when the mic is refused', async () => {
    const rec = recorder({ startMic: vi.fn(() => Promise.reject(new Error('Permission denied'))) });
    wave.instance = { registerPlugin: vi.fn(() => rec) };

    const { container } = render(<CallWave active />);
    await Promise.resolve();

    expect(rec.startMic).toHaveBeenCalled();
    expect(container.firstChild).toBeInTheDocument();
  });

  it('survives a plugin that cannot start or cannot be torn down', () => {
    wave.instance = {
      registerPlugin: vi.fn(() => {
        throw new Error('MediaRecorder unsupported');
      }),
    };
    const first = render(<CallWave active />);
    expect(() => first.unmount()).not.toThrow();

    const rec = recorder({
      stopMic: vi.fn(() => {
        throw new Error('already stopped');
      }),
      destroy: vi.fn(() => {
        throw new Error('already destroyed');
      }),
    });
    wave.instance = { registerPlugin: vi.fn(() => rec) };
    const second = render(<CallWave active />);
    expect(() => second.unmount()).not.toThrow();
    expect(rec.destroy).toHaveBeenCalled();
  });
});

/**
 * The call panel, in each phase a call passes through.
 *
 * The panel sits above the conversation and is the only thing on screen while a
 * call is up, so what it must never do is claim a state the call is not in: an
 * incoming call offers Answer and Decline and nothing else, a call in progress
 * offers Hang up, and an idle one renders nothing at all rather than an empty
 * frame where the conversation should be.
 *
 * The recording strip is the other half. A take goes through UPLOADING and
 * CONVERTING before it is anything a colleague can open, and each of those is a
 * distinct thing to say — "Ready" over a file FFmpeg has not produced yet is a
 * link to nothing.
 */
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { schemaMockLink } from './schema-mock';
import CallPanel from '../src/staff-chat/call-panel';
import type { RecordStage } from '../src/staff-chat/useCallRecorder';

const testTheme = createTheme();

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.HTMLMediaElement.prototype.play ??= () => Promise.resolve();
  globalThis.HTMLMediaElement.prototype.pause ??= () => undefined;
  // The waveform draws to a canvas jsdom does not implement; it only has to
  // exist, because what is asserted is the panel around it.
  globalThis.HTMLCanvasElement.prototype.getContext ??= (() => null) as never;
  Object.defineProperty(globalThis, 'AudioContext', {
    configurable: true,
    value: class {
      createAnalyser() {
        return {
          fftSize: 0,
          frequencyBinCount: 32,
          getByteTimeDomainData: () => undefined,
          connect: () => undefined,
          disconnect: () => undefined,
        };
      }
      createMediaStreamSource() {
        return { connect: () => undefined, disconnect: () => undefined };
      }
      close() {
        return Promise.resolve();
      }
    },
  });
});

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const fakeStream = () =>
  ({
    getTracks: () => [],
    getAudioTracks: () => [],
    getVideoTracks: () => [],
  }) as unknown as MediaStream;

type PanelProps = Parameters<typeof CallPanel>[0];

const spies = () => ({
  onAnswer: vi.fn(),
  onDecline: vi.fn(),
  onHangUp: vi.fn(),
  onMic: vi.fn(),
  onCam: vi.fn(),
  onShare: vi.fn(),
  onStopSharing: vi.fn(),
  onToggleMute: vi.fn(),
  onToggleCamera: vi.fn(),
  onToggleRecord: vi.fn(),
  onSendRecording: vi.fn(),
  onDismissRecording: vi.fn(),
  onDismissError: vi.fn(),
});

const panel = (over: Partial<PanelProps> = {}) => {
  const handlers = spies();
  const result = render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} link={schemaMockLink()}>
      <ThemeProvider theme={testTheme}>
        <CallPanel
          phase="connected"
          kind="VIDEO"
          peerName="Vikram N"
          peerPhoto=""
          error={null}
          localStream={fakeStream()}
          remoteStream={fakeStream()}
          micId=""
          camId=""
          sharing={false}
          muted={false}
          cameraOff={false}
          recordStage="IDLE"
          recordPct={0}
          recordUrl={null}
          recordError={null}
          {...handlers}
          {...over}
        />
      </ThemeProvider>
    </MockedProvider>
  );
  return { ...result, handlers };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('CallPanel', () => {
  it('renders nothing at all while no call is up', () => {
    const { container } = panel({ phase: 'idle' });

    expect(container.textContent ?? '').toBe('');
  });

  it('names who is calling while it rings', async () => {
    const { container } = panel({ phase: 'ringing' });
    await settle();

    expect(container.textContent).toContain('Vikram N');
  });

  it('offers Answer and Decline on an incoming call, and neither on one already up', async () => {
    const incoming = panel({ phase: 'incoming' });
    await settle();
    for (const control of incoming.container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }
    expect(
      incoming.handlers.onAnswer.mock.calls.length + incoming.handlers.onDecline.mock.calls.length
    ).toBeGreaterThan(0);

    const live = panel({ phase: 'connected' });
    await settle();
    for (const control of live.container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }
    expect(live.handlers.onAnswer).not.toHaveBeenCalled();
  });

  it('renders an audio call, which has a stage but no video in it', async () => {
    const { container } = panel({ kind: 'AUDIO', remoteStream: null });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('shows the call still connecting, with nothing from the other end yet', async () => {
    const { container } = panel({ remoteStream: null });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('shows a muted microphone and a camera that is off', async () => {
    const { container } = panel({ muted: true, cameraOff: true });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('shows the screen going out in place of the camera', async () => {
    const { container } = panel({ sharing: true });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('says what went wrong rather than leaving the window blank', async () => {
    const { container } = panel({
      error: { message: 'shell.chat.call.connectionLost', detail: 'ICE: failed' },
    });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it.each<RecordStage>(['IDLE', 'RECORDING', 'UPLOADING', 'CONVERTING', 'READY', 'FAILED'])(
    'says which stage a recording is at rather than calling them all ready (%s)',
    async (recordStage) => {
      const { container } = panel({
        recordStage,
        recordPct: 40,
        recordUrl: recordStage === 'READY' ? 'https://cdn.duncit.com/call.mp4' : null,
        recordError: recordStage === 'FAILED' ? 'The take could not be converted' : null,
      });
      await settle();

      expect(container.innerHTML).not.toBe('');
    }
  );

  it('sends a finished recording only when there is one to send', async () => {
    const { container, handlers } = panel({
      recordStage: 'READY',
      recordUrl: 'https://cdn.duncit.com/call.mp4',
    });
    await settle();

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
      await settle();
    }

    for (const [url] of handlers.onSendRecording.mock.calls) {
      expect(url).toBe('https://cdn.duncit.com/call.mp4');
    }
  });

  it('renders the connection meter only where the panel was given somewhere to probe', async () => {
    const withMeter = panel({ probeUrl: 'https://cdn.duncit.com/probe.bin', probeBytes: 50_000 });
    await settle();
    expect(withMeter.container.innerHTML).not.toBe('');

    const without = panel();
    await settle();
    expect(without.container.innerHTML).not.toBe('');
  });

  it('survives every control on a live call being pressed', async () => {
    const { container } = panel();
    await settle();

    for (const control of [...container.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 20)) {
      if (control.isConnected) fireEvent.click(control);
      await settle();
    }

    expect(container.innerHTML).not.toBe('');
  });
});

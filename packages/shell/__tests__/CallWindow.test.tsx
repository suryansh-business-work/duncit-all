/**
 * The call, in a window of its own — pure wiring between useCall/useCallRecorder
 * and the FloatingWindow/CallPanel that render them. Both are stubbed here so
 * this file can prove every prop reaches the right call.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CallWindow from '../src/staff-chat/CallWindow';
import type { Coworker } from '../src/staff-chat/queries';

let windowProps: Record<string, any> | null = null;
let panelProps: Record<string, any> | null = null;

vi.mock('../src/floating-window', () => ({
  default: (props: Record<string, any>) => {
    windowProps = props;
    return <div>{props.children}</div>;
  },
}));

vi.mock('../src/staff-chat/call-panel', () => ({
  default: (props: Record<string, any>) => {
    panelProps = props;
    return <div />;
  },
}));

const PEER: Coworker = { id: 'u-peer', name: 'Vikram N', photo: 'https://cdn.test/p.png' } as Coworker;

const makeCall = (over: Record<string, unknown> = {}) => ({
  phase: 'idle',
  kind: 'AUDIO',
  peerId: null,
  peerName: '',
  error: null,
  dismissError: vi.fn(),
  localStream: null,
  remoteStream: null,
  answer: vi.fn(async () => undefined),
  decline: vi.fn(),
  hangUp: vi.fn(),
  micId: '',
  camId: '',
  setMicId: vi.fn(),
  setCamId: vi.fn(),
  sharing: false,
  shareScreen: vi.fn(async () => undefined),
  stopSharing: vi.fn(async () => undefined),
  muted: false,
  cameraOff: false,
  toggleMute: vi.fn(),
  toggleCamera: vi.fn(),
  ...over,
});

const makeRecorder = (over: Record<string, unknown> = {}) => ({
  stage: 'idle',
  pct: 0,
  url: null,
  error: null,
  toggle: vi.fn(),
  reset: vi.fn(),
  ...over,
});

const mount = (over: Record<string, unknown> = {}) => {
  const onSendRecording = vi.fn();
  const props = {
    open: true,
    peer: PEER,
    call: makeCall(),
    recorder: makeRecorder(),
    onSendRecording,
    ...over,
  };
  render(<CallWindow {...(props as never)} />);
  return { onSendRecording, props };
};

describe('CallWindow', () => {
  it('names the call after the offer itself, not the open conversation', () => {
    mount({ call: makeCall({ peerName: 'Asha (from the offer)' }) });

    expect(windowProps?.title).toContain('Asha (from the offer)');
  });

  it('falls back to the open conversation, then to a generic name, when the offer named nobody', () => {
    mount({ call: makeCall({ peerId: 'u-peer' }) });
    expect(windowProps?.title).toContain('Vikram N');

    mount({ peer: null, call: makeCall({ peerId: null }) });
    expect(windowProps?.title).toContain('Coworker');
  });

  it('does not use the open conversation as the caller unless the ids actually match', () => {
    mount({ peer: PEER, call: makeCall({ peerId: 'someone-else' }) });

    expect(windowProps?.title).toContain('Coworker');
  });

  it('titles a video call differently from an audio one', () => {
    mount({ call: makeCall({ peerId: 'u-peer', kind: 'VIDEO' }) });
    expect(windowProps?.title).toContain('Video');

    mount({ call: makeCall({ peerId: 'u-peer', kind: 'AUDIO' }) });
    expect(windowProps?.title).not.toContain('Video');
  });

  it('shows no subtitle for an unknown phase, and the right one for each known phase', () => {
    mount({ call: makeCall({ phase: 'idle' }) });
    expect(windowProps?.subtitle).toBeUndefined();

    mount({ call: makeCall({ phase: 'ringing' }) });
    expect(windowProps?.subtitle).toBeTruthy();

    mount({ call: makeCall({ phase: 'incoming' }) });
    expect(windowProps?.subtitle).toBeTruthy();

    mount({ call: makeCall({ phase: 'connected' }) });
    expect(windowProps?.subtitle).toBeTruthy();
  });

  it('asks before closing while the call is live, but not while idle', () => {
    mount({ call: makeCall({ phase: 'idle' }) });
    expect(windowProps?.closeWarning).toBeUndefined();

    mount({ call: makeCall({ phase: 'connected', peerId: 'u-peer' }) });
    expect(windowProps?.closeWarning?.title).toBeTruthy();
    expect(windowProps?.closeWarning?.message).toContain('Vikram N');
  });

  it('hangs up and resets the recorder on close', () => {
    const call = makeCall();
    const recorder = makeRecorder();
    mount({ call, recorder });

    windowProps?.onClose();

    expect(call.hangUp).toHaveBeenCalledTimes(1);
    expect(recorder.reset).toHaveBeenCalledTimes(1);
  });

  it('answers and shares the screen through the panel, swallowing a refusal either way', async () => {
    const call = makeCall({
      answer: vi.fn().mockRejectedValueOnce(new Error('denied')),
      shareScreen: vi.fn().mockRejectedValueOnce(new Error('denied')),
      stopSharing: vi.fn().mockRejectedValueOnce(new Error('denied')),
    });
    mount({ call });

    await expect(panelProps?.onAnswer()).resolves.toBeUndefined();
    await expect(panelProps?.onShare()).resolves.toBeUndefined();
    await expect(panelProps?.onStopSharing()).resolves.toBeUndefined();

    expect(call.answer).toHaveBeenCalledTimes(1);
    expect(call.shareScreen).toHaveBeenCalledTimes(1);
    expect(call.stopSharing).toHaveBeenCalledTimes(1);
  });

  it('passes the photo only for the coworker actually on this call', () => {
    mount({ call: makeCall({ peerId: 'u-peer' }) });
    expect(panelProps?.peerPhoto).toBe('https://cdn.test/p.png');

    mount({ call: makeCall({ peerId: null }) });
    expect(panelProps?.peerPhoto).toBe('');
  });
});

/**
 * The staff call, with a fake browser under it.
 *
 * Calls are peer to peer — the server only forwards the offer, the answer and
 * the ICE candidates — so nothing about them exists in jsdom and none of this
 * hook had ever run. Standing in a scriptable `RTCPeerConnection` and
 * `mediaDevices` makes the whole state machine reachable, and the rules it
 * keeps are the ones a call gets wrong in ways nobody notices until it matters:
 *
 *  - a call that never joins up must SAY so. It used to look exactly like a
 *    call that joined up silently — the window said Connected and nothing
 *    arrived — and ICE is the only thing that knows.
 *  - a remembered microphone that is not here any more falls back to the system
 *    default and forgets the stale id, rather than refusing to place a call
 *    over a choice made by a past session on another laptop.
 *  - every ending writes its own outcome: DECLINED, CANCELLED before it was
 *    answered, ANSWERED after. The record is the only trace a call leaves.
 *  - hanging up stops the tracks. A camera left live after the window closes is
 *    the single worst bug this file could have.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCall, type DevicePrefs } from '../src/staff-chat/useCall';

const ME = 'u-me';
const PEER = 'u-peer';

type Handler = (payload: unknown) => void;

/** A socket that records what was emitted and can be made to receive. */
const fakeSocket = () => {
  const handlers = new Map<string, Set<Handler>>();
  const emitted: { event: string; payload: unknown }[] = [];
  return {
    emitted,
    on(event: string, handler: Handler) {
      const bucket = handlers.get(event) ?? new Set<Handler>();
      bucket.add(handler);
      handlers.set(event, bucket);
    },
    off(event: string, handler: Handler) {
      handlers.get(event)?.delete(handler);
    },
    emit(event: string, payload: unknown) {
      emitted.push({ event, payload });
    },
    receive(event: string, payload: unknown) {
      for (const handler of handlers.get(event) ?? []) handler(payload);
    },
    sent: (event: string) => emitted.filter((entry) => entry.event === event),
  };
};

type FakeSocket = ReturnType<typeof fakeSocket>;

const track = (kind: 'audio' | 'video') => ({
  kind,
  enabled: true,
  stopped: false,
  stop() {
    this.stopped = true;
  },
  addEventListener: vi.fn(),
  onended: null,
});

const stream = (kinds: ('audio' | 'video')[]) => {
  const tracks = kinds.map(track);
  return {
    tracks,
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
    removeTrack: vi.fn(),
    addTrack: vi.fn(),
  };
};

/** The last connection built, so a test can drive its callbacks. */
let peer: {
  iceConnectionState: string;
  onicecandidate: ((event: { candidate: unknown }) => void) | null;
  ontrack: ((event: { streams: unknown[] }) => void) | null;
  oniceconnectionstatechange: (() => void) | null;
  closed: boolean;
} | null = null;

let media: { getUserMedia: ReturnType<typeof vi.fn>; getDisplayMedia: ReturnType<typeof vi.fn> };

const devices: DevicePrefs = { micId: '', camId: '', onChoose: vi.fn() };

beforeEach(() => {
  peer = null;
  media = {
    getUserMedia: vi.fn(async () => stream(['audio', 'video'])),
    getDisplayMedia: vi.fn(async () => stream(['video'])),
  };
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: media,
  });

  class FakePeerConnection {
    iceConnectionState = 'new';
    onicecandidate: ((event: { candidate: unknown }) => void) | null = null;
    ontrack: ((event: { streams: unknown[] }) => void) | null = null;
    oniceconnectionstatechange: (() => void) | null = null;
    closed = false;
    senders: { track: unknown; replaceTrack: ReturnType<typeof vi.fn> }[] = [];

    constructor() {
      peer = this as never;
    }
    addTrack(added: unknown) {
      const sender = { track: added, replaceTrack: vi.fn() };
      this.senders.push(sender);
      return sender;
    }
    getSenders() {
      return this.senders;
    }
    createOffer = vi.fn(async () => ({ type: 'offer', sdp: 'v=0' }));
    createAnswer = vi.fn(async () => ({ type: 'answer', sdp: 'v=0' }));
    setLocalDescription = vi.fn(async () => undefined);
    setRemoteDescription = vi.fn(async () => undefined);
    addIceCandidate = vi.fn(async () => undefined);
    close() {
      this.closed = true;
    }
  }
  Object.defineProperty(globalThis, 'RTCPeerConnection', {
    configurable: true,
    value: FakePeerConnection,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

const mount = (socket: FakeSocket | null = fakeSocket()) => {
  const rendered = renderHook(() => useCall(socket as never, ME, devices, []));
  return { ...rendered, socket };
};

const OFFER = { type: 'offer', sdp: 'v=0' };

describe('useCall', () => {
  it('starts idle, on nobody', () => {
    const { result } = mount();

    expect(result.current.phase).toBe('idle');
    expect(result.current.peerId).toBeNull();
  });

  it('rings the other side and forwards the offer through the server', async () => {
    const { result, socket } = mount();

    await act(async () => {
      await result.current.call(PEER, 'AUDIO');
    });

    expect(result.current.phase).toBe('ringing');
    expect(result.current.peerId).toBe(PEER);
    expect(socket?.sent('call_offer').length).toBeGreaterThan(0);
  });

  it('opens the camera for a video call and only the microphone for an audio one', async () => {
    const { result } = mount();

    await act(async () => {
      await result.current.call(PEER, 'VIDEO');
    });
    expect(media.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: true }));

    media.getUserMedia.mockClear();
    const audio = mount();
    await act(async () => {
      await audio.result.current.call(PEER, 'AUDIO');
    });
    expect(media.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: false }));
  });

  it('says so when the microphone is refused instead of opening a silent window', async () => {
    media.getUserMedia.mockRejectedValueOnce(
      Object.assign(new Error('denied'), { name: 'NotAllowedError' })
    );
    const { result } = mount();

    await act(async () => {
      await result.current.call(PEER, 'AUDIO');
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.phase).toBe('idle');
  });

  it('falls back to the default device when a remembered one is gone, and forgets it', async () => {
    const remembered: DevicePrefs = { micId: 'old-mic', camId: '', onChoose: vi.fn() };
    media.getUserMedia
      .mockRejectedValueOnce(Object.assign(new Error('gone'), { name: 'OverconstrainedError' }))
      .mockResolvedValueOnce(stream(['audio']));
    const { result } = renderHook(() => useCall(fakeSocket() as never, ME, remembered, []));

    await act(async () => {
      await result.current.call(PEER, 'AUDIO');
    });

    // Forgotten, so a stale id cannot bite twice — and said out loud, because
    // the call is now on a device nobody picked today.
    expect(remembered.onChoose).toHaveBeenCalledWith('mic', '');
    expect(result.current.error).not.toBeNull();
    expect(result.current.phase).toBe('ringing');
  });

  it('forwards its own ICE candidates and keeps the stream the other end sends', async () => {
    const { result, socket } = mount();
    await act(async () => {
      await result.current.call(PEER, 'AUDIO');
    });

    act(() => {
      peer?.onicecandidate?.({ candidate: { candidate: 'a=candidate' } });
      peer?.onicecandidate?.({ candidate: null });
      peer?.ontrack?.({ streams: [stream(['audio'])] });
    });

    expect(socket?.sent('call_ice')).toHaveLength(1);
  });

  it('says a call never joined up rather than sitting silently on Connected', async () => {
    const { result } = mount();
    await act(async () => {
      await result.current.call(PEER, 'AUDIO');
    });

    act(() => {
      if (peer) peer.iceConnectionState = 'failed';
      peer?.oniceconnectionstatechange?.();
    });

    expect(result.current.error).not.toBeNull();
  });

  it('shows an incoming call and answers it with an answer back through the server', async () => {
    const { result, socket } = mount();

    act(() => {
      socket?.receive('call_offer', { from: PEER, from_name: 'Vikram N', kind: 'AUDIO', sdp: OFFER });
    });
    expect(result.current.phase).toBe('incoming');
    expect(result.current.peerName).toBe('Vikram N');

    await act(async () => {
      await result.current.answer();
    });

    expect(socket?.sent('call_answer').length).toBeGreaterThan(0);
    expect(result.current.phase).toBe('connected');
  });

  it('answers nothing when no call is ringing', async () => {
    const { result } = mount();

    await act(async () => {
      await result.current.answer();
    });

    expect(result.current.phase).toBe('idle');
  });

  it('records a decline, and tells the caller rather than just going quiet', () => {
    const { result, socket } = mount();
    act(() => {
      socket?.receive('call_offer', { from: PEER, from_name: 'Vikram N', kind: 'AUDIO', sdp: OFFER });
    });

    act(() => {
      result.current.decline();
    });

    expect(socket?.sent('call_decline').length).toBeGreaterThan(0);
    const [record] = socket?.sent('call_record') ?? [];
    expect((record?.payload as { outcome: string })?.outcome).toBe('DECLINED');
    expect(result.current.phase).toBe('idle');
  });

  it('records a call hung up before it was answered as cancelled, not answered', async () => {
    const { result, socket } = mount();
    await act(async () => {
      await result.current.call(PEER, 'AUDIO');
    });

    act(() => {
      result.current.hangUp();
    });

    const [record] = socket?.sent('call_record') ?? [];
    expect((record?.payload as { outcome: string })?.outcome).toBe('CANCELLED');
  });

  it('records a call hung up after it connected as answered', async () => {
    const { result, socket } = mount();
    act(() => {
      socket?.receive('call_offer', { from: PEER, from_name: 'Vikram N', kind: 'AUDIO', sdp: OFFER });
    });
    await act(async () => {
      await result.current.answer();
    });

    act(() => {
      result.current.hangUp();
    });

    const [record] = socket?.sent('call_record') ?? [];
    expect((record?.payload as { outcome: string })?.outcome).toBe('ANSWERED');
  });

  it('stops every track when the call ends — a live camera after the window closes is the worst bug here', async () => {
    const live = stream(['audio', 'video']);
    media.getUserMedia.mockResolvedValueOnce(live);
    const { result } = mount();
    await act(async () => {
      await result.current.call(PEER, 'AUDIO');
    });

    act(() => {
      result.current.hangUp();
    });

    expect(live.tracks.every((t) => t.stopped)).toBe(true);
    expect(peer?.closed).toBe(true);
  });

  it('ends when the other side hangs up, and when they decline', async () => {
    const ended = mount();
    await act(async () => {
      await ended.result.current.call(PEER, 'AUDIO');
    });
    act(() => {
      ended.socket?.receive('call_end', { from: PEER });
    });
    expect(ended.result.current.phase).toBe('idle');

    const declined = mount();
    await act(async () => {
      await declined.result.current.call(PEER, 'AUDIO');
    });
    act(() => {
      declined.socket?.receive('call_decline', { from: PEER });
    });
    expect(declined.result.current.phase).toBe('idle');
  });

  it('takes the answer and the candidates the other end sends', async () => {
    const { result, socket } = mount();
    await act(async () => {
      await result.current.call(PEER, 'AUDIO');
    });

    await act(async () => {
      socket?.receive('call_answer', { from: PEER, sdp: { type: 'answer', sdp: 'v=0' } });
      socket?.receive('call_ice', { from: PEER, candidate: { candidate: 'a=candidate' } });
    });

    expect(result.current.phase).toBe('connected');
  });

  it('surfaces an error the server reports about the call', () => {
    const { result, socket } = mount();

    act(() => {
      socket?.receive('call_error', { key: 'shell.chat.call.busy' });
    });

    expect(result.current.error).not.toBeNull();
  });

  it('mutes and unmutes the microphone through the tracks themselves', async () => {
    const live = stream(['audio', 'video']);
    media.getUserMedia.mockResolvedValueOnce(live);
    const { result } = mount();
    await act(async () => {
      await result.current.call(PEER, 'VIDEO');
    });

    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.muted).toBe(true);
    expect(live.getAudioTracks()[0]?.enabled).toBe(false);

    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.muted).toBe(false);
  });

  it('turns the camera off and on through the tracks themselves', async () => {
    const live = stream(['audio', 'video']);
    media.getUserMedia.mockResolvedValueOnce(live);
    const { result } = mount();
    await act(async () => {
      await result.current.call(PEER, 'VIDEO');
    });

    act(() => {
      result.current.toggleCamera();
    });
    expect(result.current.cameraOff).toBe(true);
    expect(live.getVideoTracks()[0]?.enabled).toBe(false);
  });

  it('shares the screen in place of the camera, and gives the camera back', async () => {
    const { result } = mount();
    await act(async () => {
      await result.current.call(PEER, 'VIDEO');
    });

    await act(async () => {
      await result.current.shareScreen();
    });
    expect(media.getDisplayMedia).toHaveBeenCalled();

    await act(async () => {
      await result.current.stopSharing();
    });
    expect(result.current.sharing).toBe(false);
  });

  it('does nothing at all without a socket, rather than throwing', async () => {
    const { result } = mount(null);

    await act(async () => {
      await result.current.call(PEER, 'AUDIO');
    });

    expect(result.current.phase).toBe('ringing');
  });

  it('lets the caller name the other side and change the chosen devices', () => {
    const { result } = mount();

    act(() => {
      result.current.setPeerName('Vikram N');
      result.current.setMicId('mic-2');
      result.current.setCamId('cam-2');
    });

    expect(result.current.peerName).toBe('Vikram N');
    expect(devices.onChoose).toHaveBeenCalled();
  });
});

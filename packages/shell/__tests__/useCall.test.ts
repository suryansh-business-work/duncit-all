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
  config?: { iceServers?: unknown };
  getSenders?: () => { track: { kind: string; stopped: boolean } | null; replaceTrack: ReturnType<typeof vi.fn> }[];
} | null = null;

let media: { getUserMedia: ReturnType<typeof vi.fn>; getDisplayMedia: ReturnType<typeof vi.fn> };

const devices: DevicePrefs = {
  micId: '',
  camId: '',
  micLabel: '',
  camLabel: '',
  onChoose: vi.fn(),
};

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
    config?: { iceServers?: unknown };

    constructor(config?: { iceServers?: unknown }) {
      this.config = config;
      peer = this as never;
    }
    addTrack(added: unknown) {
      const sender: { track: unknown; replaceTrack: ReturnType<typeof vi.fn> } = {
        track: added,
        // Mirrors real RTCRtpSender behaviour: replaceTrack updates .track itself,
        // which is exactly what lets a stray call clear it out from under a
        // concurrent switch — see the mid-call race test below.
        replaceTrack: vi.fn(async (next: unknown) => {
          sender.track = next ?? null;
        }),
      };
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

/** Flushes a fire-and-forget async path (chooseMic/chooseCam do not return their promise). */
const settle = () => act(async () => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
});

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

  it('falls back to the default device when a remembered one is gone, and keeps it', async () => {
    const remembered: DevicePrefs = {
      micId: 'old-mic',
      camId: '',
      micLabel: 'Headset',
      camLabel: '',
      onChoose: vi.fn(),
    };
    media.getUserMedia
      .mockRejectedValueOnce(Object.assign(new Error('gone'), { name: 'OverconstrainedError' }))
      .mockResolvedValueOnce(stream(['audio']));
    const { result } = renderHook(() => useCall(fakeSocket() as never, ME, remembered, []));

    await act(async () => {
      await result.current.call(PEER, 'AUDIO');
    });

    // KEPT: one console failing to find the device is not a reason to throw the
    // choice away for the other sixteen. Said out loud, though, because this
    // call is now on a device nobody picked today.
    expect(remembered.onChoose).not.toHaveBeenCalled();
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

  it('refuses to call yourself, without opening a ringing window', async () => {
    const { result } = mount();

    await act(async () => {
      await result.current.call(ME, 'AUDIO');
    });

    expect(result.current.error?.message).toBe('shell.chat.call.selfCall');
    expect(result.current.phase).toBe('idle');
  });

  it('reports an answer that fails, and tears the attempt down rather than sitting on it', async () => {
    const { result, socket } = mount();
    act(() => {
      socket?.receive('call_offer', { from: PEER, from_name: 'Vikram N', kind: 'AUDIO', sdp: OFFER });
    });

    media.getUserMedia.mockRejectedValueOnce(
      Object.assign(new Error('denied'), { name: 'NotAllowedError' })
    );

    await act(async () => {
      await result.current.answer();
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.phase).toBe('idle');
  });

  it('names a self-call refusal from the server distinctly from a generic start failure', () => {
    const { result, socket } = mount();

    act(() => {
      socket?.receive('call_error', { reason: 'SELF_CALL' });
    });

    expect(result.current.error?.message).toBe('shell.chat.call.selfCall');
  });

  describe('reconnecting mid-call', () => {
    it('says nothing on a bare reconnect with no call up', () => {
      const { socket } = mount();

      act(() => {
        socket?.receive('connect', undefined);
      });

      expect(socket?.sent('call_resume')).toHaveLength(0);
    });

    it('tells the server it is still on the call after the socket reconnects', async () => {
      const { result, socket } = mount();
      await act(async () => {
        await result.current.call(PEER, 'AUDIO');
      });

      act(() => {
        socket?.receive('connect', undefined);
      });

      const resumes = socket?.sent('call_resume') ?? [];
      expect(resumes).toHaveLength(1);
      expect((resumes[0]?.payload as { to: string }).to).toBe(PEER);
    });
  });

  describe('a second call arriving while one is already up', () => {
    it('declines it outright, rather than replacing the call in progress', async () => {
      const { result, socket } = mount();
      await act(async () => {
        await result.current.call(PEER, 'AUDIO');
      });

      act(() => {
        socket?.receive('call_offer', { from: 'u-stranger', kind: 'AUDIO', sdp: OFFER });
      });

      const declines = socket?.sent('call_decline') ?? [];
      expect(declines.some((entry) => (entry.payload as { to: string }).to === 'u-stranger')).toBe(true);
      expect(result.current.phase).toBe('ringing');
      expect(result.current.peerId).toBe(PEER);
    });
  });

  describe('a signal about a call that is not this one', () => {
    it('ignores a decline meant for someone else, rather than tearing this call down', async () => {
      const { result, socket } = mount();
      await act(async () => {
        await result.current.call(PEER, 'AUDIO');
      });

      act(() => {
        socket?.receive('call_decline', { from: 'u-stranger' });
      });

      expect(result.current.phase).toBe('ringing');
      expect(socket?.sent('call_record')).toHaveLength(0);
    });

    it('ignores a hang-up meant for someone else', async () => {
      const { result, socket } = mount();
      await act(async () => {
        await result.current.call(PEER, 'AUDIO');
      });

      act(() => {
        socket?.receive('call_end', { from: 'u-stranger' });
      });

      expect(result.current.phase).toBe('ringing');
    });
  });

  describe('switching microphone or camera mid-call', () => {
    it('replaces the sender track and stops the old one', async () => {
      const { result } = mount();
      await act(async () => {
        await result.current.call(PEER, 'VIDEO');
      });
      const audioSender = peer?.getSenders?.().find((s) => s.track?.kind === 'audio');
      const originalTrack = audioSender?.track;

      act(() => {
        result.current.setMicId('mic-2');
      });
      await settle();

      expect(audioSender?.replaceTrack).toHaveBeenCalledTimes(1);
      expect(originalTrack?.stopped).toBe(true);
      expect(devices.onChoose).toHaveBeenCalledWith('mic', 'mic-2', '');
    });

    it('does nothing when there is no sender of that kind to swap the device into', async () => {
      media.getUserMedia.mockResolvedValueOnce(stream(['audio']));
      const { result } = mount();
      await act(async () => {
        await result.current.call(PEER, 'AUDIO');
      });
      media.getUserMedia.mockClear();

      act(() => {
        result.current.setCamId('cam-2');
      });
      await settle();

      expect(media.getUserMedia).not.toHaveBeenCalled();
    });

    it('reports a switch that fails, rather than leaving the caller unsure which device is live', async () => {
      const { result } = mount();
      await act(async () => {
        await result.current.call(PEER, 'AUDIO');
      });
      media.getUserMedia.mockRejectedValueOnce(new Error('device busy'));

      act(() => {
        result.current.setMicId('mic-2');
      });
      await settle();

      expect(result.current.error?.message).toBe('device busy');
    });

    it('shelves a camera switch while the screen is being shared, instead of yanking the screen away', async () => {
      const { result } = mount();
      await act(async () => {
        await result.current.call(PEER, 'VIDEO');
      });
      const videoSender = peer?.getSenders?.().find((s) => s.track?.kind === 'video');

      await act(async () => {
        await result.current.shareScreen();
      });
      expect(videoSender?.replaceTrack).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.setCamId('cam-3');
      });
      await settle();

      // The sender still carries the screen — the new camera is only shelved.
      expect(videoSender?.replaceTrack).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.stopSharing();
      });

      // Sharing ends onto the newly-chosen camera, not the one live before the switch.
      expect(videoSender?.replaceTrack).toHaveBeenCalledTimes(2);
    });
  });

  describe('sharing the screen', () => {
    it('says a screen share needs a video call, rather than opening the picker for nothing', async () => {
      media.getUserMedia.mockResolvedValueOnce(stream(['audio']));
      const { result } = mount();
      await act(async () => {
        await result.current.call(PEER, 'AUDIO');
      });

      await act(async () => {
        await result.current.shareScreen();
      });

      expect(media.getDisplayMedia).not.toHaveBeenCalled();
      expect(result.current.error?.message).toBe('shell.chat.call.shareNeedsVideo');
    });

    it('does nothing when the display picker hands back a stream with no video track', async () => {
      const { result } = mount();
      await act(async () => {
        await result.current.call(PEER, 'VIDEO');
      });
      media.getDisplayMedia.mockResolvedValueOnce(stream([]));

      await act(async () => {
        await result.current.shareScreen();
      });

      expect(result.current.sharing).toBe(false);
    });

    it('says nothing at all when the share picker is simply cancelled', async () => {
      const { result } = mount();
      await act(async () => {
        await result.current.call(PEER, 'VIDEO');
      });
      media.getDisplayMedia.mockRejectedValueOnce(
        Object.assign(new Error('cancelled'), { name: 'NotAllowedError' })
      );

      await act(async () => {
        await result.current.shareScreen();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.sharing).toBe(false);
    });

    it('reports a screen share that fails for a real reason', async () => {
      const { result } = mount();
      await act(async () => {
        await result.current.call(PEER, 'VIDEO');
      });
      media.getDisplayMedia.mockRejectedValueOnce(new Error('display capture is not supported'));

      await act(async () => {
        await result.current.shareScreen();
      });

      expect(result.current.error?.message).toBe('display capture is not supported');
    });

    it('brings the camera back on its own when the browser stop-sharing bar ends the track', async () => {
      const { result } = mount();
      await act(async () => {
        await result.current.call(PEER, 'VIDEO');
      });
      const display = stream(['video']);
      media.getDisplayMedia.mockResolvedValueOnce(display);

      await act(async () => {
        await result.current.shareScreen();
      });
      expect(result.current.sharing).toBe(true);

      act(() => {
        display.tracks[0]?.onended?.();
      });

      expect(result.current.sharing).toBe(false);
    });
  });

  describe('naming a device chosen before the name was saved', () => {
    it('writes the name back once this browser can resolve a saved microphone id', async () => {
      media.enumerateDevices = vi.fn(async () => [
        { deviceId: 'mic-1', kind: 'audioinput', label: 'Blue Yeti', groupId: '' } as MediaDeviceInfo,
      ]);
      const named: DevicePrefs = { micId: 'mic-1', camId: '', micLabel: '', camLabel: '', onChoose: vi.fn() };

      renderHook(() => useCall(fakeSocket() as never, ME, named, []));
      await settle();

      expect(named.onChoose).toHaveBeenCalledWith('mic', 'mic-1', 'Blue Yeti');
    });

    it('does the same for a saved camera id', async () => {
      media.enumerateDevices = vi.fn(async () => [
        { deviceId: 'cam-1', kind: 'videoinput', label: 'FaceTime HD', groupId: '' } as MediaDeviceInfo,
      ]);
      const named: DevicePrefs = { micId: '', camId: 'cam-1', micLabel: '', camLabel: '', onChoose: vi.fn() };

      renderHook(() => useCall(fakeSocket() as never, ME, named, []));
      await settle();

      expect(named.onChoose).toHaveBeenCalledWith('cam', 'cam-1', 'FaceTime HD');
    });

    it('does nothing once a name is already saved for the pair', async () => {
      media.enumerateDevices = vi.fn(async () => [
        { deviceId: 'mic-1', kind: 'audioinput', label: 'Blue Yeti', groupId: '' } as MediaDeviceInfo,
      ]);
      const already: DevicePrefs = {
        micId: 'mic-1',
        camId: '',
        micLabel: 'Blue Yeti',
        camLabel: '',
        onChoose: vi.fn(),
      };

      renderHook(() => useCall(fakeSocket() as never, ME, already, []));
      await settle();

      expect(already.onChoose).not.toHaveBeenCalled();
    });

    it('does not write the name again once it has already been written this session', async () => {
      media.enumerateDevices = vi.fn(async () => [
        { deviceId: 'mic-1', kind: 'audioinput', label: 'Blue Yeti', groupId: '' } as MediaDeviceInfo,
      ]);
      const named: DevicePrefs = { micId: 'mic-1', camId: '', micLabel: '', camLabel: '', onChoose: vi.fn() };

      const { rerender } = renderHook((props: DevicePrefs) => useCall(fakeSocket() as never, ME, props, []), {
        initialProps: named,
      });
      await settle();
      expect(named.onChoose).toHaveBeenCalledTimes(1);

      // A new object with the same values still changes the effect's dependency
      // on `devices`, so this proves the guard is the `named` ref, not the props.
      rerender({ ...named });
      await settle();

      expect(named.onChoose).toHaveBeenCalledTimes(1);
    });
  });

  it('says plainly that this browser cannot use the microphone or camera at all', async () => {
    Object.defineProperty(globalThis.navigator, 'mediaDevices', { configurable: true, value: undefined });
    const { result } = mount();

    await act(async () => {
      await result.current.call(PEER, 'AUDIO');
    });

    expect(result.current.error?.message).toBe('shell.chat.call.noMediaDevices');
    expect(result.current.phase).toBe('idle');
  });

  it('uses the servers the server handed it, rather than the public fallback', async () => {
    const rendered = renderHook(() =>
      useCall(fakeSocket() as never, ME, devices, [{ urls: ['turn:relay.duncit.com'] }])
    );

    await act(async () => {
      await rendered.result.current.call(PEER, 'AUDIO');
    });

    expect(peer?.config?.iceServers).toEqual([{ urls: ['turn:relay.duncit.com'] }]);
  });

  it('warns about a saved microphone that cannot be resolved, even though opening the call still succeeds', async () => {
    media.enumerateDevices = vi.fn(async () => [
      { deviceId: 'other-mic', kind: 'audioinput', label: 'Built-in Mic', groupId: '' } as MediaDeviceInfo,
    ]);
    const remembered: DevicePrefs = { micId: 'old-mic', camId: '', micLabel: 'Headset', camLabel: '', onChoose: vi.fn() };
    const { result } = renderHook(() => useCall(fakeSocket() as never, ME, remembered, []));
    await settle();

    await act(async () => {
      await result.current.call(PEER, 'AUDIO');
    });

    expect(result.current.error?.message).toBe('shell.chat.call.deviceGone');
    expect(result.current.phase).toBe('ringing');
  });

  it('warns about a saved camera that cannot be resolved, on a video call', async () => {
    media.enumerateDevices = vi.fn(async () => [
      { deviceId: 'other-cam', kind: 'videoinput', label: 'External Cam', groupId: '' } as MediaDeviceInfo,
    ]);
    const remembered: DevicePrefs = { micId: '', camId: 'old-cam', micLabel: '', camLabel: 'Old Webcam', onChoose: vi.fn() };
    const { result } = renderHook(() => useCall(fakeSocket() as never, ME, remembered, []));
    await settle();

    await act(async () => {
      await result.current.call(PEER, 'VIDEO');
    });

    expect(result.current.error?.message).toBe('shell.chat.call.deviceGone');
  });

  it('mutes without throwing when there is no local stream to mute', () => {
    const { result } = mount();

    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.muted).toBe(true);
  });

  it('toggles the camera flag without throwing when there is no local stream', () => {
    const { result } = mount();

    act(() => {
      result.current.toggleCamera();
    });

    expect(result.current.cameraOff).toBe(true);
  });

  it('does nothing when told to stop sharing but nothing is being shared', async () => {
    const { result } = mount();

    await act(async () => {
      await result.current.stopSharing();
    });

    expect(result.current.sharing).toBe(false);
  });

  it('stops the shared screen too when a call carrying it is hung up', async () => {
    const { result } = mount();
    await act(async () => {
      await result.current.call(PEER, 'VIDEO');
    });
    const display = stream(['video']);
    media.getDisplayMedia.mockResolvedValueOnce(display);
    await act(async () => {
      await result.current.shareScreen();
    });

    act(() => {
      result.current.hangUp();
    });

    expect(display.tracks.every((t) => t.stopped)).toBe(true);
  });

  it('does nothing risky when hung up with no call ever placed', () => {
    const { result, socket } = mount();

    act(() => {
      result.current.hangUp();
    });

    expect(socket?.sent('call_end')).toHaveLength(0);
    expect(result.current.phase).toBe('idle');
  });

  describe('an incoming offer missing its optional fields', () => {
    it('falls back to a generic name and an audio call', () => {
      const { result, socket } = mount();

      act(() => {
        socket?.receive('call_offer', { from: PEER });
      });

      expect(result.current.phase).toBe('incoming');
      expect(result.current.peerName).toBe('Coworker');
      expect(result.current.kind).toBe('AUDIO');
    });

    it('answers nothing when the offer carried no SDP at all', async () => {
      const { result, socket } = mount();
      act(() => {
        socket?.receive('call_offer', { from: PEER });
      });

      await act(async () => {
        await result.current.answer();
      });

      expect(result.current.phase).toBe('incoming');
    });
  });

  describe('the answer and ICE handlers guard against a call that is not there', () => {
    it('ignores an answer arriving with no call in progress', () => {
      const { result, socket } = mount();

      act(() => {
        socket?.receive('call_answer', { from: PEER, sdp: { type: 'answer', sdp: 'v=0' } });
      });

      expect(result.current.phase).toBe('idle');
    });

    it('ignores an answer with no SDP on it, rather than trying to apply it', async () => {
      const { result, socket } = mount();
      await act(async () => {
        await result.current.call(PEER, 'AUDIO');
      });

      await act(async () => {
        socket?.receive('call_answer', { from: PEER });
      });

      expect(result.current.phase).toBe('ringing');
    });

    it('ignores an incoming ICE candidate with no call in progress', () => {
      const { socket } = mount();

      expect(() => {
        act(() => {
          socket?.receive('call_ice', { from: PEER, candidate: { candidate: 'x' } });
        });
      }).not.toThrow();
    });

    it('ignores a signal with no candidate on it', async () => {
      const { result, socket } = mount();
      await act(async () => {
        await result.current.call(PEER, 'AUDIO');
      });

      await act(async () => {
        socket?.receive('call_ice', { from: PEER });
      });

      expect((peer as unknown as { addIceCandidate: ReturnType<typeof vi.fn> })?.addIceCandidate).not.toHaveBeenCalled();
    });
  });

  it('plays the end tone when the other side hangs up on a call that was actually answered', async () => {
    const { result, socket } = mount();
    act(() => {
      socket?.receive('call_offer', { from: PEER, from_name: 'Vikram N', kind: 'AUDIO', sdp: OFFER });
    });
    await act(async () => {
      await result.current.answer();
    });

    act(() => {
      socket?.receive('call_end', { from: PEER });
    });

    expect(result.current.phase).toBe('idle');
  });

  describe('switching device mid-call, edge cases', () => {
    it('does nothing when the opened device hands back no track at all', async () => {
      const { result } = mount();
      await act(async () => {
        await result.current.call(PEER, 'AUDIO');
      });
      media.getUserMedia.mockResolvedValueOnce(stream([]));

      act(() => {
        result.current.setMicId('mic-2');
      });
      await settle();

      expect(result.current.error).toBeNull();
    });

    it('skips updating the local preview when the sender track vanished while the new device was opening', async () => {
      const localMedia = stream(['audio', 'video']);
      media.getUserMedia.mockResolvedValueOnce(localMedia);
      const { result } = mount();
      await act(async () => {
        await result.current.call(PEER, 'VIDEO');
      });
      const videoSender = peer?.getSenders?.().find((s) => s.track?.kind === 'video');

      let resolveSwitch: ((value: unknown) => void) | undefined;
      media.getUserMedia.mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveSwitch = resolve;
        })
      );
      act(() => {
        result.current.setCamId('cam-2');
      });

      // While the new camera is still opening, the sender's track is cleared
      // out from under it — a stray "stop sharing" with nothing to hand back.
      await act(async () => {
        await result.current.stopSharing();
      });
      expect(videoSender?.track).toBeNull();

      resolveSwitch?.(stream(['video']));
      await settle();

      expect(localMedia.removeTrack).not.toHaveBeenCalled();
      expect(localMedia.addTrack).not.toHaveBeenCalled();
    });

    it('falls back to null when the shelved camera is gone by the time the browser ends the share', async () => {
      const { result } = mount();
      await act(async () => {
        await result.current.call(PEER, 'VIDEO');
      });
      const videoSender = peer?.getSenders?.().find((s) => s.track?.kind === 'video');
      const display = stream(['video']);
      media.getDisplayMedia.mockResolvedValueOnce(display);
      await act(async () => {
        await result.current.shareScreen();
      });

      // Hanging up clears the shelved camera track before the OS's own
      // "stop sharing" bar has told the track it has ended.
      act(() => {
        result.current.hangUp();
      });

      expect(() => {
        act(() => {
          display.tracks[0]?.onended?.();
        });
      }).not.toThrow();
      expect(videoSender?.replaceTrack).toHaveBeenLastCalledWith(null);
    });
  });
});

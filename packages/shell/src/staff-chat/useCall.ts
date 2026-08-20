import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { traceCall, traceCallFailure } from './callTrace';
import { describeFailure, failureFromKey, type Failure } from './failure';
import { playCallEnded, startRinging } from './sounds';

export type CallKind = 'AUDIO' | 'VIDEO';
export type CallPhase = 'idle' | 'ringing' | 'incoming' | 'connected';

/**
 * Public STUN, used until the server has said what it actually wants.
 *
 * STUN alone connects two browsers when at least one can be reached directly —
 * two tabs on one machine always can, which is why calls behave perfectly in
 * development. Between two people on separate networks it often cannot, and the
 * server's answer (see staffCallIceServers) is where a TURN relay arrives.
 */
const FALLBACK_ICE: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

interface Signal {
  from: string;
  /** Carried on the offer, so a ringing window can name the caller even
   *  when the chat is closed and nothing has loaded. */
  from_name?: string;
  kind?: CallKind;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

/** An exact deviceId, or "whatever the OS prefers" when none is chosen. */
const pickDevice = (deviceId: string): MediaTrackConstraints | true =>
  deviceId ? { deviceId: { exact: deviceId } } : true;

/**
 * The browser's media APIs, or a sentence explaining why there are none.
 *
 * `navigator.mediaDevices` is simply ABSENT outside a secure context, so
 * reaching for getUserMedia there throws "cannot read properties of undefined"
 * — true, and useless to whoever is looking at it. This is the one deployment
 * difference that never shows up on localhost, which browsers treat as secure.
 */
function mediaDevices(): MediaDevices {
  const devices = globalThis.navigator?.mediaDevices;
  if (!devices) throw new Error('shell.chat.call.noMediaDevices');
  return devices;
}

/** Open ONE track from a chosen device — the unit a mid-call swap needs. */
async function openTrack(
  want: 'audio' | 'video',
  deviceId: string
): Promise<MediaStreamTrack | undefined> {
  const exact = pickDevice(deviceId);
  const fresh = await mediaDevices().getUserMedia(
    want === 'audio' ? { audio: exact } : { video: exact }
  );
  return want === 'audio' ? fresh.getAudioTracks()[0] : fresh.getVideoTracks()[0];
}

/**
 * One call at a time, in the browser.
 *
 * The server only forwards the offer, the answer and the ICE candidates; the
 * audio and video go peer to peer. That is why there is no bandwidth cost here
 * and why the call RECORD, written when it ends, is the only trace.
 */
/** Where the chosen devices are KEPT. useCall applies them; it does not own them. */
export interface DevicePrefs {
  micId: string;
  camId: string;
  onChoose: (kind: 'mic' | 'cam', deviceId: string) => void;
}

export function useCall(
  socket: Socket | null,
  meId: string,
  devices: Readonly<DevicePrefs>,
  iceServers: readonly RTCIceServer[] = []
) {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [kind, setKind] = useState<CallKind>('AUDIO');
  const [peerId, setPeerId] = useState<string | null>(null);
  /** The row the last finished call was written to, for a late recording. */
  const [lastCallId, setLastCallId] = useState<string | null>(null);
  /** Who is on the other end, by name — set from the offer or by the caller. */
  const [peerName, setPeerName] = useState<string>('');
  const [error, setError] = useState<Failure | null>(null);
  /**
   * Which microphone and camera to open. '' means whatever the OS prefers.
   *
   * Read from the caller, not held here: this hook is remade on every mount and
   * would forget the choice each time, which is exactly how the settings dialog
   * came to look like it saved and did not.
   */
  const { micId, camId } = devices;
  const [sharing, setSharing] = useState(false);
  /** Local mute / camera state — the tracks are the truth, this mirrors them. */
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const pc = useRef<RTCPeerConnection | null>(null);
  /** The camera track set aside while the screen is being shared. */
  const cameraTrack = useRef<MediaStreamTrack | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const stopRing = useRef<(() => void) | null>(null);
  const startedAt = useRef<Date | null>(null);
  const answered = useRef(false);
  const pendingOffer = useRef<RTCSessionDescriptionInit | null>(null);

  const teardown = useCallback(() => {
    stopRing.current?.();
    stopRing.current = null;
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
    screenStream.current?.getTracks().forEach((track) => track.stop());
    screenStream.current = null;
    cameraTrack.current = null;
    setSharing(false);
    setMuted(false);
    setCameraOff(false);
    remoteStream.current = null;
    pc.current?.close();
    pc.current = null;
    pendingOffer.current = null;
    setPhase('idle');
    setPeerId(null);
  }, []);

  /** Written by whoever ends up knowing the outcome — see the socket handler. */
  const record = useCallback(
    (outcome: string, otherId: string, callKind: CallKind) => {
      const started = startedAt.current ?? new Date();
      socket?.emit(
        'call_record',
        {
          peerId: otherId,
          kind: callKind,
          outcome,
          durationSeconds: answered.current ? (Date.now() - started.getTime()) / 1000 : 0,
          startedAt: started.toISOString(),
        },
        // The row's id, so a recording that is still uploading has something to
        // attach itself to when it finishes.
        (callId: string | null) => setLastCallId(callId)
      );
      answered.current = false;
      startedAt.current = null;
    },
    [socket]
  );

  const buildPeer = useCallback(
    (otherId: string) => {
      // The server's list when it has arrived, public STUN until then — a call
      // placed in the first second must still have somewhere to look.
      const connection = new RTCPeerConnection({
        iceServers: iceServers.length > 0 ? [...iceServers] : FALLBACK_ICE,
      });
      connection.onicecandidate = (event) => {
        if (event.candidate) socket?.emit('call_ice', { to: otherId, candidate: event.candidate });
      };
      connection.ontrack = (event) => {
        remoteStream.current = event.streams[0];
      };
      // A call that never joins up used to look exactly like a call that joined
      // up silently: the window said "Connected" and nothing arrived. ICE is the
      // only thing that knows, so it is the only thing that can say so.
      connection.oniceconnectionstatechange = () => {
        if (connection.iceConnectionState === 'failed') {
          setError(failureFromKey('shell.chat.call.connectionLost'));
        }
      };
      pc.current = connection;
      return connection;
    },
    [socket, iceServers]
  );

  const openMedia = useCallback(
    async (callKind: CallKind) => {
      const wantsVideo = callKind === 'VIDEO';
      try {
        const stream = await mediaDevices().getUserMedia({
          audio: pickDevice(micId),
          video: wantsVideo ? pickDevice(camId) : false,
        });
        localStream.current = stream;
        return stream;
      } catch (err) {
        // Anything else is a real failure and belongs to the caller.
        if ((err as Error)?.name !== 'OverconstrainedError') throw err;

        /*
          The remembered microphone or camera is not here any more.

          Device ids are per browser and per machine, and they change when
          permissions are reset — so a preference saved on one laptop names
          nothing on the next one. Refusing to place the call at all is the
          wrong answer to a choice made by a PAST session: nobody asked for
          that device today. Fall back to the system default, forget the
          stale id so it cannot bite twice, and say what happened.

          A mid-call switch (useDevice) still fails loudly, because there the
          person just picked that device and silently using another one is how
          you end up broadcasting the wrong room.
        */
        const stream = await mediaDevices().getUserMedia({ audio: true, video: wantsVideo });
        localStream.current = stream;
        if (micId) devices.onChoose('mic', '');
        if (camId) devices.onChoose('cam', '');
        setError(failureFromKey('shell.chat.call.deviceGone'));
        return stream;
      }
    },
    [camId, micId, devices]
  );

  /**
   * Put the new track where the old one was in the local preview, so teardown
   * still stops what is actually live and the self-view does not freeze.
   */
  const swapInPreview = useCallback((previous: MediaStreamTrack | null, next: MediaStreamTrack) => {
    const preview = localStream.current;
    if (!preview || !previous) return;
    preview.removeTrack(previous);
    preview.addTrack(next);
  }, []);

  /**
   * Point the call at a different microphone or camera, mid-call.
   *
   * `openMedia` only runs when a call STARTS, so setting the state alone would
   * have left the menu doing nothing until the next one — a settings control
   * that silently does nothing is worse than not having one. Same mechanism as
   * the screen share: open the one track and swap what the sender is pushing,
   * with no renegotiation.
   */
  const useDevice = useCallback(
    async (want: 'audio' | 'video', deviceId: string) => {
      // No call in progress: the choice is remembered and the next call opens it.
      const sender = pc.current?.getSenders().find((s) => s.track?.kind === want);
      if (!sender) return;
      try {
        const track = await openTrack(want, deviceId);
        if (!track) return;
        // Sharing: the sender is carrying the screen, so the new camera waits
        // for sharing to stop rather than yanking it out from under them.
        if (want === 'video' && screenStream.current) {
          const shelved = cameraTrack.current;
          cameraTrack.current = track;
          swapInPreview(shelved, track);
          shelved?.stop();
          return;
        }
        const previous = sender.track;
        await sender.replaceTrack(track);
        swapInPreview(previous, track);
        previous?.stop();
      } catch (err) {
        setError(describeFailure(err, 'shell.chat.call.switchFailed'));
      }
    },
    [swapInPreview]
  );

  /**
   * Mute, or unmute.
   *
   * `track.enabled = false` keeps the track in the connection and stops it
   * carrying anything — the other end sees silence rather than a renegotiation,
   * and unmuting is instant because nothing had to be given back.
   */
  const toggleMute = useCallback(() => {
    const tracks = localStream.current?.getAudioTracks() ?? [];
    const next = !muted;
    tracks.forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [muted]);

  /** Camera off, the same way — the track stays, it just stops sending frames. */
  const toggleCamera = useCallback(() => {
    const tracks = localStream.current?.getVideoTracks() ?? [];
    const next = !cameraOff;
    tracks.forEach((track) => {
      track.enabled = !next;
    });
    setCameraOff(next);
  }, [cameraOff]);

  /** Remember the choice AND apply it to a call already running. */
  const chooseMic = useCallback(
    (deviceId: string) => {
      devices.onChoose('mic', deviceId);
      useDevice('audio', deviceId).catch(() => undefined);
    },
    [useDevice, devices]
  );

  const chooseCam = useCallback(
    (deviceId: string) => {
      devices.onChoose('cam', deviceId);
      useDevice('video', deviceId).catch(() => undefined);
    },
    [useDevice, devices]
  );

  /**
   * Share the screen in place of the camera.
   *
   * `replaceTrack` swaps what the existing video sender is pushing, so the call
   * carries on without a new offer — no renegotiation, nothing to go wrong
   * mid-call. That also means it needs a video sender to exist, so it is only
   * offered on a video call; the panel says as much rather than presenting a
   * button that would do nothing on an audio one.
   */
  const shareScreen = useCallback(async () => {
    const connection = pc.current;
    const sender = connection?.getSenders().find((s) => s.track?.kind === 'video');
    if (!sender) {
      setError(failureFromKey('shell.chat.call.shareNeedsVideo'));
      return;
    }
    try {
      const display = await mediaDevices().getDisplayMedia({ video: true });
      const track = display.getVideoTracks()[0];
      if (!track) return;
      cameraTrack.current = sender.track;
      screenStream.current = display;
      await sender.replaceTrack(track);
      setSharing(true);
      // The browser's own "Stop sharing" bar ends the track without telling us,
      // so the camera has to come back from the track, not only from our button.
      track.onended = () => {
        sender.replaceTrack(cameraTrack.current ?? null).catch(() => undefined);
        screenStream.current = null;
        setSharing(false);
      };
    } catch (err) {
      // Cancelling the picker throws too; that is not worth an error banner.
      if ((err as Error)?.name !== 'NotAllowedError') {
        setError(describeFailure(err, 'shell.chat.call.shareFailed'));
      }
    }
  }, []);

  const stopSharing = useCallback(async () => {
    const connection = pc.current;
    const sender = connection?.getSenders().find((s) => s.track?.kind === 'video');
    screenStream.current?.getTracks().forEach((track) => track.stop());
    screenStream.current = null;
    if (sender) await sender.replaceTrack(cameraTrack.current ?? null);
    setSharing(false);
  }, []);

  /** Place a call. The other end rings until it answers, declines or gives up. */
  const call = useCallback(
    async (otherId: string, callKind: CallKind) => {
      setError(null);
      // Caught here as well as on the server, so the window never opens for a
      // call that cannot exist. The directory hides you from yourself, so this
      // only fires when the id on screen is not the id on the socket — worth
      // saying out loud rather than watching the call kill itself.
      if (otherId === meId) {
        setError(failureFromKey('shell.chat.call.selfCall'));
        return;
      }
      // Show the window BEFORE asking for the microphone. getUserMedia does not
      // resolve until the browser's permission prompt is answered, and on a
      // domain being used for the first time that prompt is the whole delay —
      // so waiting for it to open the window made a fresh deployment look like
      // a call button that does nothing at all. It opens, then it fills in.
      setKind(callKind);
      setPeerId(otherId);
      setPhase('ringing');
      try {
        const stream = await openMedia(callKind);
        const connection = buildPeer(otherId);
        stream.getTracks().forEach((track) => connection.addTrack(track, stream));
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        traceCall('offer sent', { to: otherId, kind: callKind });
        socket?.emit('call_offer', { to: otherId, kind: callKind, sdp: offer });
        startedAt.current = new Date();
      } catch (err) {
        // Almost always a refused camera or microphone permission.
        setError(describeFailure(err, 'shell.chat.call.startFailed'));
        teardown();
      }
    },
    [buildPeer, openMedia, socket, teardown]
  );

  /** Pick up. */
  const answer = useCallback(async () => {
    const offer = pendingOffer.current;
    if (!offer || !peerId) return;
    try {
      stopRing.current?.();
      stopRing.current = null;
      const stream = await openMedia(kind);
      const connection = buildPeer(peerId);
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
      await connection.setRemoteDescription(offer);
      const localAnswer = await connection.createAnswer();
      await connection.setLocalDescription(localAnswer);
      socket?.emit('call_answer', { to: peerId, sdp: localAnswer });
      answered.current = true;
      startedAt.current = new Date();
      setPhase('connected');
    } catch (err) {
      setError(describeFailure(err, 'shell.chat.call.answerFailed'));
      teardown();
    }
  }, [buildPeer, kind, openMedia, peerId, socket, teardown]);

  /** Say no. The caller is told, and the record says DECLINED. */
  const decline = useCallback(() => {
    if (peerId) {
      socket?.emit('call_decline', { to: peerId });
      record('DECLINED', peerId, kind);
    }
    teardown();
  }, [kind, peerId, record, socket, teardown]);

  /** Hang up, whether it was answered or not. */
  const hangUp = useCallback(() => {
    if (peerId) {
      socket?.emit('call_end', { to: peerId });
      record(answered.current ? 'ANSWERED' : 'CANCELLED', peerId, kind);
      // Only when a call was actually up: a tone for a call that never
      // connected would be a sound for nothing happening.
      if (answered.current) playCallEnded();
    }
    teardown();
  }, [kind, peerId, record, socket, teardown]);

  useEffect(() => {
    if (!socket) return undefined;

    const onOffer = (signal: Signal) => {
      // One call at a time: a second offer while busy is declined outright
      // rather than quietly replacing the call in progress.
      if (pc.current || phase !== 'idle') {
        traceCallFailure('declining: already busy', { from: signal.from, phase, hasPeer: Boolean(pc.current) });
        socket.emit('call_decline', { to: signal.from });
        return;
      }
      traceCall('offer received', { from: signal.from, kind: signal.kind });
      pendingOffer.current = signal.sdp ?? null;
      setKind(signal.kind ?? 'AUDIO');
      setPeerId(signal.from);
      setPeerName(signal.from_name ?? 'Coworker');
      setPhase('incoming');
      stopRing.current = startRinging();
    };

    const onAnswer = async (signal: Signal) => {
      if (!pc.current || !signal.sdp) return;
      await pc.current.setRemoteDescription(signal.sdp);
      answered.current = true;
      startedAt.current = startedAt.current ?? new Date();
      setPhase('connected');
    };

    const onIce = async (signal: Signal) => {
      if (!pc.current || !signal.candidate) return;
      await pc.current.addIceCandidate(signal.candidate).catch(() => undefined);
    };

    /*
      Is this signal about the call I am actually on?

      These handlers used to ignore the payload entirely and tear down on any
      decline or hang-up that arrived. A signal from a conversation you are not
      in — or, before the server refused it, one you sent yourself — killed a
      live call with nothing on screen to say why. A signal with no `from` is
      treated as ours, because that is what every earlier client sends.
    */
    const aboutThisCall = (signal: Signal) => !signal?.from || signal.from === peerId;

    const onDecline = (signal: Signal) => {
      if (!aboutThisCall(signal)) {
        traceCall('ignored a decline for another call', { from: signal?.from, peerId });
        return;
      }
      traceCallFailure('declined by the other end', { from: signal?.from });
      // The caller writes this one: the callee already wrote DECLINED.
      if (peerId) record('MISSED', peerId, kind);
      teardown();
    };

    const onEnd = (signal: Signal) => {
      if (!aboutThisCall(signal)) {
        traceCall('ignored a hang-up for another call', { from: signal?.from, peerId });
        return;
      }
      traceCall('the other end hung up', { from: signal?.from });
      // The other end hung up. The tone matters more here than on your own
      // click: you did not do it, so nothing else on screen says why the call
      // just vanished.
      if (answered.current) playCallEnded();
      teardown();
    };

    /** The server refused the call outright — say so instead of vanishing. */
    const onCallError = (payload: { reason?: string }) => {
      setError(
        failureFromKey(
          payload?.reason === 'SELF_CALL'
            ? 'shell.chat.call.selfCall'
            : 'shell.chat.call.startFailed'
        )
      );
      teardown();
    };

    /*
      Back after a blip, still on the call.

      socket.io reconnects on its own and the server cannot tell that from a
      closed tab — so it schedules the call's end and waits to hear this. Only a
      browser that still holds the peer connection can send it, which is exactly
      the distinction the server needs: a page that was refreshed comes back
      without one and stays quiet.
    */
    const onConnect = () => {
      if (pc.current && peerId) socket.emit('call_resume', { to: peerId });
    };

    socket.on('connect', onConnect);
    socket.on('call_error', onCallError);
    socket.on('call_offer', onOffer);
    socket.on('call_answer', onAnswer);
    socket.on('call_ice', onIce);
    socket.on('call_decline', onDecline);
    socket.on('call_end', onEnd);
    return () => {
      socket.off('connect', onConnect);
      socket.off('call_error', onCallError);
      socket.off('call_offer', onOffer);
      socket.off('call_answer', onAnswer);
      socket.off('call_ice', onIce);
      socket.off('call_decline', onDecline);
      socket.off('call_end', onEnd);
    };
  }, [socket, phase, peerId, kind, record, teardown]);

  return {
    phase,
    lastCallId,
    peerName,
    setPeerName,
    kind,
    peerId,
    error,
    call,
    answer,
    decline,
    hangUp,
    localStream: localStream.current,
    remoteStream: remoteStream.current,
    micId,
    camId,
    setMicId: chooseMic,
    setCamId: chooseCam,
    sharing,
    shareScreen,
    stopSharing,
    muted,
    cameraOff,
    toggleMute,
    toggleCamera,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { startRinging } from './sounds';

export type CallKind = 'AUDIO' | 'VIDEO';
export type CallPhase = 'idle' | 'ringing' | 'incoming' | 'connected';

/**
 * Public STUN only.
 *
 * Two people on the same office network connect directly; anyone behind a
 * symmetric NAT would need a TURN relay, which is a paid service and a
 * deliberate decision rather than something to slip in. When a call fails to
 * connect, that is why — and the call record still says it happened.
 */
const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

interface Signal {
  from: string;
  kind?: CallKind;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

/**
 * One call at a time, in the browser.
 *
 * The server only forwards the offer, the answer and the ICE candidates; the
 * audio and video go peer to peer. That is why there is no bandwidth cost here
 * and why the call RECORD, written when it ends, is the only trace.
 */
export function useCall(socket: Socket | null, meId: string) {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [kind, setKind] = useState<CallKind>('AUDIO');
  const [peerId, setPeerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pc = useRef<RTCPeerConnection | null>(null);
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
      socket?.emit('call_record', {
        peerId: otherId,
        kind: callKind,
        outcome,
        durationSeconds: answered.current ? (Date.now() - started.getTime()) / 1000 : 0,
        startedAt: started.toISOString(),
      });
      answered.current = false;
      startedAt.current = null;
    },
    [socket]
  );

  const buildPeer = useCallback(
    (otherId: string) => {
      const connection = new RTCPeerConnection({ iceServers: ICE });
      connection.onicecandidate = (event) => {
        if (event.candidate) socket?.emit('call_ice', { to: otherId, candidate: event.candidate });
      };
      connection.ontrack = (event) => {
        remoteStream.current = event.streams[0];
      };
      pc.current = connection;
      return connection;
    },
    [socket]
  );

  const openMedia = useCallback(async (callKind: CallKind) => {
    const stream = await globalThis.navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callKind === 'VIDEO',
    });
    localStream.current = stream;
    return stream;
  }, []);

  /** Place a call. The other end rings until it answers, declines or gives up. */
  const call = useCallback(
    async (otherId: string, callKind: CallKind) => {
      setError(null);
      try {
        const stream = await openMedia(callKind);
        const connection = buildPeer(otherId);
        stream.getTracks().forEach((track) => connection.addTrack(track, stream));
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        socket?.emit('call_offer', { to: otherId, kind: callKind, sdp: offer });
        startedAt.current = new Date();
        setKind(callKind);
        setPeerId(otherId);
        setPhase('ringing');
      } catch (err) {
        // Almost always a refused camera or microphone permission.
        setError(err instanceof Error ? err.message : 'Could not start the call');
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
      setError(err instanceof Error ? err.message : 'Could not answer');
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
    }
    teardown();
  }, [kind, peerId, record, socket, teardown]);

  useEffect(() => {
    if (!socket) return undefined;

    const onOffer = (signal: Signal) => {
      // One call at a time: a second offer while busy is declined outright
      // rather than quietly replacing the call in progress.
      if (pc.current || phase !== 'idle') {
        socket.emit('call_decline', { to: signal.from });
        return;
      }
      pendingOffer.current = signal.sdp ?? null;
      setKind(signal.kind ?? 'AUDIO');
      setPeerId(signal.from);
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

    const onDecline = () => {
      // The caller writes this one: the callee already wrote DECLINED.
      if (peerId) record('MISSED', peerId, kind);
      teardown();
    };

    const onEnd = () => {
      teardown();
    };

    socket.on('call_offer', onOffer);
    socket.on('call_answer', onAnswer);
    socket.on('call_ice', onIce);
    socket.on('call_decline', onDecline);
    socket.on('call_end', onEnd);
    return () => {
      socket.off('call_offer', onOffer);
      socket.off('call_answer', onAnswer);
      socket.off('call_ice', onIce);
      socket.off('call_decline', onDecline);
      socket.off('call_end', onEnd);
    };
  }, [socket, phase, peerId, kind, record, teardown]);

  return {
    phase,
    kind,
    peerId,
    error,
    call,
    answer,
    decline,
    hangUp,
    localStream: localStream.current,
    remoteStream: remoteStream.current,
  };
}

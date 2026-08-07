import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DataPacket_Kind,
  RoomEvent,
  Track,
  type RemoteTrack,
  type Room,
} from 'livekit-client';
import { decodeRemote, encodeRemote, type RemoteMessage } from './protocol';

export type ShareRole = 'IDLE' | 'SHARING' | 'VIEWING';

interface Grant {
  url: string;
  token: string;
  room: string;
}

/**
 * The screen-share room, and the channel the control protocol rides on.
 *
 * LiveKit rather than the peer connection the audio/video call already has,
 * because this is a different problem: a screen at readable resolution needs
 * simulcast and congestion control to survive a bad line, and a data channel
 * carrying twenty cursor frames a second alongside it needs to not fight the
 * media for bandwidth. That is what an SFU is for.
 *
 * The room is joined lazily — connecting costs a server round trip and a WebRTC
 * negotiation, and most conversations never share a screen at all.
 */
export function useScreenShareRoom(onMessage: (message: RemoteMessage) => void) {
  const roomRef = useRef<Room | null>(null);
  const [role, setRole] = useState<ShareRole>('IDLE');
  const [remoteTrack, setRemoteTrack] = useState<MediaStreamTrack | null>(null);
  /**
   * What I am sharing, shown back to me.
   *
   * Not vanity: the pointer, the drawing and the click ripples are painted over
   * the STAGE, not over the real desktop. Without my own screen in that stage I
   * see a black box with somebody's cursor moving across it and no way to tell
   * what they are pointing at.
   */
  const [localTrack, setLocalTrack] = useState<MediaStreamTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Kept in a ref so the LiveKit listener never closes over a stale handler.
  const handler = useRef(onMessage);
  handler.current = onMessage;

  const leave = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    setRole('IDLE');
    setRemoteTrack(null);
    setLocalTrack(null);
    await room?.disconnect().catch(() => undefined);
  }, []);

  const join = useCallback(async (grant: Grant): Promise<Room | null> => {
    if (roomRef.current) return roomRef.current;
    try {
      // Imported here rather than at module scope: livekit-client is a large
      // dependency and every portal loads this shell, but almost nobody shares
      // a screen. This keeps it out of the initial bundle.
      const { Room: LiveKitRoom } = await import('livekit-client');
      const room = new LiveKitRoom({ adaptiveStream: true, dynacast: true });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.source === Track.Source.ScreenShare) {
          setRemoteTrack(track.mediaStreamTrack);
          setRole('VIEWING');
        }
      });
      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.source === Track.Source.ScreenShare) {
          setRemoteTrack(null);
          setRole((current) => (current === 'VIEWING' ? 'IDLE' : current));
        }
      });
      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        const message = decodeRemote(payload);
        if (message) handler.current(message);
      });
      room.on(RoomEvent.Disconnected, () => {
        roomRef.current = null;
        setRole('IDLE');
        setRemoteTrack(null);
      });

      await room.connect(grant.url, grant.token);
      roomRef.current = room;
      return room;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join the screen share');
      return null;
    }
  }, []);

  /** Start sharing this screen into the room. */
  const startSharing = useCallback(
    async (grant: Grant) => {
      setError(null);
      const room = await join(grant);
      if (!room) return;
      try {
        await room.localParticipant.setScreenShareEnabled(true, {
          // Audio too: a shared screen with a video playing on it is silent
          // otherwise, which reads as a broken share.
          audio: true,
          // THIS TAB, and only this tab.
          //
          // Two reasons, and the second is the important one. Offering a
          // monitor or another window means offering everything else open on
          // the machine — inboxes, other consoles, a password manager — when
          // what is being discussed is this portal. And remote control travels
          // as fractions of the shared surface: with a whole monitor those
          // fractions land somewhere in the desktop, but with the tab they map
          // exactly onto the viewport whose elements are being clicked. A
          // screen picker set to "monitor" is a control feature that silently
          // aims at the wrong place.
          video: { displaySurface: 'browser' },
          preferCurrentTab: true,
          selfBrowserSurface: 'include',
          surfaceSwitching: 'exclude',
          systemAudio: 'exclude',
          contentHint: 'text',
        });
        const mine = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
        setLocalTrack(mine?.track?.mediaStreamTrack ?? null);
        setRole('SHARING');
      } catch (err) {
        // Cancelling the picker throws; that is not an error worth showing.
        if ((err as Error)?.name !== 'NotAllowedError') {
          setError(err instanceof Error ? err.message : 'Could not share the screen');
        }
      }
    },
    [join]
  );

  const stopSharing = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setScreenShareEnabled(false).catch(() => undefined);
    setLocalTrack(null);
    setRole('IDLE');
    // Nobody left to watch and nothing left to send: hold no connection open.
    if (room.remoteParticipants.size === 0) await leave();
  }, [leave]);

  /** Watch what the other side is sharing. */
  const watch = useCallback(
    async (grant: Grant) => {
      setError(null);
      await join(grant);
    },
    [join]
  );

  /**
   * Send one protocol message.
   *
   * LOSSY on purpose: cursor frames, drawing points and scroll offsets are
   * only useful while they are current, and a reliable channel would queue and
   * replay stale ones after a hiccup — the cursor would crawl through where it
   * used to be instead of jumping to where it is.
   */
  const send = useCallback((message: RemoteMessage) => {
    const room = roomRef.current;
    if (!room) return;
    room.localParticipant
      .publishData(encodeRemote(message), { reliable: false })
      .catch(() => undefined);
  }, []);

  /** Control handover is the exception: it must not be dropped. */
  const sendReliable = useCallback((message: RemoteMessage) => {
    const room = roomRef.current;
    if (!room) return;
    room.localParticipant
      .publishData(encodeRemote(message), { reliable: true })
      .catch(() => undefined);
  }, []);

  useEffect(
    () => () => {
      roomRef.current?.disconnect().catch(() => undefined);
      roomRef.current = null;
    },
    []
  );

  return {
    role,
    remoteTrack,
    localTrack,
    error,
    startSharing,
    stopSharing,
    watch,
    leave,
    send,
    sendReliable,
  };
}

export { DataPacket_Kind };

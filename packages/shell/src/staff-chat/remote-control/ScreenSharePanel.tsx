import { useEffect, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Alert, Box, Stack } from '@mui/material';
import { STAFF_SCREEN_SHARE_GRANT } from '../queries';
import ShareStage, { type PointerTool } from './ShareStage';
import ShareToolbar from './ShareToolbar';
import { useRemoteControl } from './useRemoteControl';
import { useScreenShareRoom } from './useScreenShareRoom';

interface Props {
  peerId: string;
  peerName: string;
  /** Closed by the panel when neither side is sharing any more. */
  onClose: () => void;
}

/**
 * Portal-to-portal screen sharing, with the pointer, the drawing and the
 * control handover that make it useful for actually helping somebody.
 *
 * THE BOUNDARY, stated once and honestly: a browser cannot move another
 * machine's mouse, type into another tab, or touch the browser's own chrome.
 * Granted control here means intent is REPLAYED inside the other person's
 * Duncit console — a click at a document position, a keystroke into the focused
 * field, a scroll offset. Inside our own consoles that is indistinguishable
 * from driving; at the edge of the page it stops, and this UI says so rather
 * than pretending otherwise.
 */
export default function ScreenSharePanel({ peerId, peerName, onClose }: Readonly<Props>) {
  const client = useApolloClient();
  const [tool, setTool] = useState<PointerTool>('POINTER');
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Which side this is has to be known BEFORE the room exists, because the
  // room's first data frame can arrive before any render — so it is a ref the
  // hook reads, not a value captured at construction.
  const sharingRef = useRef(false);
  const control = useRemoteControl(sharingRef);
  const room = useScreenShareRoom(control.receive);
  const amSharing = room.role === 'SHARING';
  sharingRef.current = amSharing;
  const driving = !amSharing && control.myControl === 'GRANTED';

  /** A join token for the room this pair shares. */
  const grant = async () => {
    const result = await client.query({
      query: STAFF_SCREEN_SHARE_GRANT,
      variables: { peerId },
      fetchPolicy: 'network-only',
    });
    return result.data?.staffScreenShareGrant;
  };

  useEffect(() => {
    // Watch from the moment the panel opens: the other side may already be
    // sharing, and making somebody press "join" to see it is a step for
    // nothing.
    grant()
      .then((value) => value && room.watch(value))
      .catch(() => undefined);
    return () => {
      room.leave().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId]);

  /**
   * Keep the viewer's page at the same place as the sharer's.
   *
   * Sent by the SHARER, because they are the one whose screen is the subject —
   * the viewer is watching a video of it and scrolling their own page would
   * only move the chat. Throttled to animation frames: scroll fires far faster
   * than anything can usefully follow.
   */
  useEffect(() => {
    if (!amSharing) return;
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      globalThis.requestAnimationFrame(() => {
        queued = false;
        room.send({ t: 'scroll', x: globalThis.scrollX, y: globalThis.scrollY });
      });
    };
    globalThis.addEventListener('scroll', onScroll, { passive: true });
    return () => globalThis.removeEventListener('scroll', onScroll);
  }, [amSharing, room]);

  const fullscreen = () => {
    const node = stageRef.current;
    if (!node) return;
    if (globalThis.document.fullscreenElement) {
      globalThis.document.exitFullscreen().catch(() => undefined);
    } else {
      node.requestFullscreen?.().catch(() => undefined);
    }
  };

  return (
    <Box sx={{ p: 1.5 }} ref={stageRef}>
      <Stack spacing={1}>
        {room.error && <Alert severity="error">{room.error}</Alert>}

        {control.theyControl && (
          <Alert severity="warning" icon={false}>
            {peerName} is controlling your screen. Revoke at any time.
          </Alert>
        )}

        <ShareStage
          track={room.remoteTrack}
          tool={tool}
          driving={driving}
          cursor={control.cursor}
          cursorMode={control.cursorMode}
          cursorLabel={peerName}
          strokes={control.strokes}
          ripples={control.ripples}
          onSend={room.send}
        />

        <ShareToolbar
          amSharing={amSharing}
          tool={tool}
          onTool={setTool}
          onClear={() => {
            control.clear();
            room.send({ t: 'clear' });
          }}
          onFullscreen={fullscreen}
          onStop={() => {
            room.stopSharing().catch(() => undefined);
            onClose();
          }}
          pendingRequest={control.pendingRequest}
          theyControl={control.theyControl}
          onGrant={() => {
            control.setTheyControl(true);
            control.setPendingRequest(false);
            room.sendReliable({ t: 'control-grant' });
          }}
          onRevoke={() => {
            control.setTheyControl(false);
            room.sendReliable({ t: 'control-revoke' });
          }}
          myControl={control.myControl}
          onRequest={() => {
            control.setMyControl('REQUESTED');
            room.sendReliable({ t: 'control-request' });
          }}
        />
      </Stack>
    </Box>
  );
}

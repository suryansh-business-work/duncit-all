import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import ShareOverlay, { type Ripple, type Stroke } from './ShareOverlay';
import { CURSOR_INTERVAL_MS, toFraction, type NormalisedPoint, type RemoteMessage } from './protocol';

export type PointerTool = 'POINTER' | 'LASER' | 'DRAW';

interface Props {
  track: MediaStreamTrack | null;
  tool: PointerTool;
  /** True when this side may actually drive, not only point. */
  driving: boolean;
  cursor: NormalisedPoint | null;
  cursorMode: 'POINTER' | 'LASER';
  cursorLabel: string;
  strokes: Stroke[];
  ripples: Ripple[];
  onSend: (message: RemoteMessage) => void;
}

/**
 * The shared screen, with everything drawn over it.
 *
 * All pointer maths happens against THIS element's box and travels as
 * fractions, so the two ends agree regardless of window size, zoom or the
 * aspect of the screen being shared.
 */
export default function ShareStage({
  track,
  tool,
  driving,
  cursor,
  cursorMode,
  cursorLabel,
  strokes,
  ripples,
  onSend,
}: Readonly<Props>) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const lastSent = useRef(0);
  const drawing = useRef(false);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    node.srcObject = track ? new MediaStream([track]) : null;
  }, [track]);

  const pointAt = (event: React.PointerEvent) => {
    const box = wrapRef.current?.getBoundingClientRect();
    return box ? toFraction(event.clientX, event.clientY, box) : null;
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const at = pointAt(event);
    if (!at) return;
    const now = Date.now();
    // Pointer events fire far faster than anyone can see; twenty a second is
    // smooth and leaves the channel free for the video.
    if (now - lastSent.current >= CURSOR_INTERVAL_MS) {
      lastSent.current = now;
      onSend({ t: 'cursor', at, mode: tool === 'LASER' ? 'LASER' : 'POINTER' });
    }
    if (tool === 'DRAW' && drawing.current) onSend({ t: 'draw', at, colour: '#f44336' });
  };

  const onPointerDown = (event: React.PointerEvent) => {
    const at = pointAt(event);
    if (!at) return;
    if (tool === 'DRAW') {
      drawing.current = true;
      onSend({ t: 'draw', at, colour: '#f44336' });
      return;
    }
    // A ripple always — pointing at something is useful even without control.
    onSend({ t: 'ping', at });
    if (driving) onSend({ t: 'click', at });
  };

  const endStroke = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onSend({ t: 'draw', end: true });
  };

  return (
    <Box
      ref={wrapRef}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={endStroke}
      onPointerLeave={endStroke}
      onKeyDown={(event) => {
        if (!driving) return;
        event.preventDefault();
        onSend({
          t: 'key',
          key: event.key,
          ctrl: event.ctrlKey,
          meta: event.metaKey,
          shift: event.shiftKey,
          alt: event.altKey,
        });
      }}
      // Focusable so keyboard sharing has somewhere to arrive.
      tabIndex={driving ? 0 : -1}
      sx={{
        position: 'relative',
        bgcolor: 'common.black',
        borderRadius: 1,
        overflow: 'hidden',
        cursor: tool === 'DRAW' ? 'crosshair' : 'default',
        outline: driving ? '2px solid' : 'none',
        outlineColor: 'success.main',
      }}
    >
      <Box
        component="video"
        ref={videoRef}
        autoPlay
        playsInline
        muted
        sx={{ width: '100%', display: 'block' }}
      />

      {!track && (
        <Typography variant="caption" sx={{ color: 'grey.500', p: 2, display: 'block' }}>
          Nobody is sharing yet — press “Share this tab”, or wait for them to
          start.
        </Typography>
      )}

      <ShareOverlay
        cursor={cursor}
        cursorMode={cursorMode}
        cursorLabel={cursorLabel}
        strokes={strokes}
        ripples={ripples}
      />
    </Box>
  );
}

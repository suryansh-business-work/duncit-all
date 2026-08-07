import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { toPixels, type NormalisedPoint } from './protocol';

export interface Stroke {
  points: NormalisedPoint[];
  colour: string;
}

export interface Ripple {
  id: number;
  at: NormalisedPoint;
}

interface Props {
  /** Where the other person's pointer is, if they are moving it. */
  cursor: NormalisedPoint | null;
  cursorMode: 'POINTER' | 'LASER';
  cursorLabel: string;
  strokes: Stroke[];
  ripples: Ripple[];
}

/**
 * Everything drawn ON TOP of the shared screen.
 *
 * A canvas for the ink and absolutely-positioned elements for the pointer, so
 * the cursor stays crisp at any zoom while the drawing survives a resize — the
 * strokes are kept as fractions and re-rendered, never as pixels blitted once.
 *
 * `pointer-events: none` throughout: this layer is a picture of what the other
 * person is doing, and it must never swallow a click meant for the page.
 */
export default function ShareOverlay({
  cursor,
  cursorMode,
  cursorLabel,
  strokes,
  ripples,
}: Readonly<Props>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const ratio = globalThis.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.scale(ratio, ratio);
    }
    ctx.clearRect(0, 0, width, height);

    const box = { left: 0, top: 0, width, height } as DOMRect;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    for (const stroke of strokes) {
      if (stroke.points.length === 0) continue;
      ctx.strokeStyle = stroke.colour;
      ctx.beginPath();
      stroke.points.forEach((point, index) => {
        const { x, y } = toPixels(point, box);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }, [strokes]);

  return (
    <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <Box
        component="canvas"
        ref={canvasRef}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      {ripples.map((ripple) => (
        <Box
          key={ripple.id}
          sx={{
            position: 'absolute',
            left: `${ripple.at.x * 100}%`,
            top: `${ripple.at.y * 100}%`,
            width: 26,
            height: 26,
            ml: '-13px',
            mt: '-13px',
            borderRadius: '50%',
            border: 2,
            borderColor: 'primary.main',
            animation: 'staffClickRipple 600ms ease-out forwards',
            '@keyframes staffClickRipple': {
              from: { transform: 'scale(0.4)', opacity: 0.9 },
              to: { transform: 'scale(1.8)', opacity: 0 },
            },
          }}
        />
      ))}

      {cursor && (
        <Box
          sx={{
            position: 'absolute',
            left: `${cursor.x * 100}%`,
            top: `${cursor.y * 100}%`,
            transform: 'translate(-2px, -2px)',
            transition: 'left 60ms linear, top 60ms linear',
          }}
        >
          {cursorMode === 'LASER' ? (
            <Box
              sx={{
                width: 16,
                height: 16,
                ml: '-8px',
                mt: '-8px',
                borderRadius: '50%',
                bgcolor: 'error.main',
                boxShadow: '0 0 12px 6px rgba(244,67,54,0.55)',
              }}
            />
          ) : (
            <>
              {/* A real arrow, not a dot: a dot at someone else's cursor
                  position reads as a bug in the video. */}
              <Box
                component="svg"
                viewBox="0 0 24 24"
                sx={{ width: 18, height: 18, display: 'block', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
              >
                <path d="M5 2l14 8-6 1.5L10 19z" fill="#fff" stroke="#1976d2" strokeWidth="1.5" />
              </Box>
              <Box
                sx={{
                  mt: 0.25,
                  px: 0.75,
                  py: 0.125,
                  borderRadius: 1,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontSize: 11,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {cursorLabel}
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

import type { MutableRefObject, PointerEvent } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { CANVAS_H, CANVAS_W } from './constants';

type CanvasHandler = (event: PointerEvent<HTMLCanvasElement>) => void;

interface Props {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  start: CanvasHandler;
  move: CanvasHandler;
  end: () => void;
  clearCanvas: () => void;
}

/** Free-hand signature canvas plus its Clear button. */
export function DrawPanel({ canvasRef, start, move, end, clearCanvas }: Readonly<Props>) {
  return (
    <Stack spacing={1}>
      <Box
        component="canvas"
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        sx={{
          width: '100%',
          height: 160,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,

          // Fixed white "paper" backdrop: the ink drawn below is a fixed
          // dark color so the signature always renders the same way,
          // regardless of the portal's light/dark mode.
          bgcolor: 'common.white',

          touchAction: 'none',
          cursor: 'crosshair'
        }} />
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <DuncitButton size="small" onClick={clearCanvas}>
          Clear
        </DuncitButton>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          Sign with a mouse, finger or stylus.
        </Typography>
      </Stack>
    </Stack>
  );
}

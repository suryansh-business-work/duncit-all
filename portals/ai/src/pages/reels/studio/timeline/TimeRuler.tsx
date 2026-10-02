import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatReelDuration } from '../../format';
import { clamp, END_PADDING_PX, msToPx, pxToMs, RULER_HEIGHT, tickSeconds } from './geometry';

interface Props {
  lengthMs: number;
  playheadMs: number;
  zoom: number;
  onSeek: (ms: number) => void;
}

/** Arrow keys move a tenth of a second; with Shift, a whole second. */
const STEP_MS = 100;
const BIG_STEP_MS = 1000;

/**
 * The time scale above the tracks, and the way to move the playhead: click or
 * drag along it, or focus it and use the arrow keys (it is a slider to assistive
 * technology, valued in milliseconds and read out as a time).
 */
export default function TimeRuler({ lengthMs, playheadMs, zoom, onSeek }: Readonly<Props>) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const step = tickSeconds(zoom);
  const ticks = Array.from({ length: Math.floor(lengthMs / 1000 / step) + 1 }, (_value, index) => index * step);

  const msAt = (clientX: number): number => {
    const left = ref.current?.getBoundingClientRect().left ?? 0;
    return clamp(pxToMs(clientX - left, zoom), 0, lengthMs);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onSeek(msAt(event.clientX));
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    // Only while the button is held — a hover is not a scrub.
    if (event.buttons === 1) onSeek(msAt(event.clientX));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const by = event.shiftKey ? BIG_STEP_MS : STEP_MS;
    const moves: Record<string, number> = {
      ArrowLeft: playheadMs - by,
      ArrowRight: playheadMs + by,
      Home: 0,
      End: lengthMs,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onSeek(clamp(next, 0, lengthMs));
  };

  return (
    <Box
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={t('ai.reels.editor.rulerLabel')}
      aria-valuemin={0}
      aria-valuemax={lengthMs}
      aria-valuenow={Math.round(playheadMs)}
      aria-valuetext={t('ai.reels.editor.playheadTime', { vars: { time: formatReelDuration(playheadMs) } })}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      data-testid="reel-timeline-ruler"
      sx={{
        position: 'relative',
        height: RULER_HEIGHT,
        width: msToPx(lengthMs, zoom) + END_PADDING_PX,
        cursor: 'pointer',
        borderBottom: '1px solid',
        borderColor: 'divider',
        touchAction: 'none',
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
      }}
    >
      {ticks.map((seconds) => (
        <Box key={`tick-${seconds}`} aria-hidden sx={{ position: 'absolute', left: msToPx(seconds * 1000, zoom), top: 0, height: '100%', borderLeft: '1px solid', borderColor: 'divider', pl: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: `${RULER_HEIGHT}px`, userSelect: 'none' }}>
            {formatReelDuration(seconds * 1000)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

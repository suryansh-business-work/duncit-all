import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import type { OccasionDecoration } from '@duncit/utils';
import { runOccasionCanvas } from './runOccasionCanvas';

export interface OccasionEffectsProps {
  decoration: OccasionDecoration;
  /** Fill the parent box (which must be positioned) instead of the viewport — a preview. */
  contained?: boolean;
  /** Paint one still frame: paused, reduced motion, or a thumbnail. */
  still?: boolean;
  /** The instant (seconds) a still frame shows. */
  stillAt?: number;
  /** Stacking order over the page. Defaults to just above the app bar, below drawers and dialogs. */
  zIndex?: number;
}

/** The app bar sits at 1100 and drawers at 1200: decoration falls past the header, never over a sheet. */
const DEFAULT_Z = 1150;

/**
 * A look's decoration — snow, fireworks, Santa crossing, the garland — on one
 * canvas over the page. Purely decorative: its frame is hidden from assistive
 * technology and transparent to every tap and click.
 */
export function OccasionEffects({ decoration, contained = false, still = false, stillAt, zIndex = DEFAULT_Z }: Readonly<OccasionEffectsProps>) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvas) return undefined;
    return runOccasionCanvas(canvas, decoration, { contained, still, stillAt });
  }, [canvas, decoration, contained, still, stillAt]);

  return (
    <Box
      aria-hidden
      data-testid="occasion-effects-frame"
      sx={{ position: contained ? 'absolute' : 'fixed', inset: 0, pointerEvents: 'none', zIndex }}
    >
      <canvas ref={setCanvas} data-testid="occasion-effects" style={{ display: 'block', width: '100%', height: '100%' }} />
    </Box>
  );
}

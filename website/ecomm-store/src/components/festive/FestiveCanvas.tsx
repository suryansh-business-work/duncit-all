import { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';

import type { OccasionEffect } from '../../theme/occasions';
import { runFestiveEffect } from './runFestiveEffect';

/**
 * The occasion's animation: one fixed, click-through canvas over the page and
 * under the app bar, drawers, dialogs and the pause button. Decorative, so
 * hidden from assistive technology. Loaded only when an animation will play.
 */
export function FestiveCanvas({ effect }: Readonly<{ effect: OccasionEffect }>) {
  const theme = useTheme();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    return runFestiveEffect(canvas, effect);
  }, [effect]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-testid="festive-canvas"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: theme.zIndex.speedDial - 1,
      }}
    />
  );
}
